const { test, expect } = require("@playwright/test");
const { PNG } = require("pngjs");

const referenceURL = process.env.UI_REFERENCE_URL || "https://www.aascmed.com";
const routes = require("./routes.json");

async function preparePage(page, url) {
  // Third-party booking and deploy-preview chrome are not part of the site UI.
  await page.route(/zocdoc\.com|netlify\.com|netlify\.app\/\.netlify/, route => route.abort());
  const response = await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => performance.getEntriesByName("onInitialClientRender").length > 0);
  await expect(page).toHaveURL(url);
  if (url.endsWith("/404.html")) {
    expect([200, 404]).toContain(response.status());
  } else {
    expect(response.status()).toBe(200);
  }
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.locator("#main")).toBeVisible();
  await expect(page.locator("#main")).not.toHaveText("");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => dispatchEvent(new Event("resize")));
  const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
  if (await dismiss.isVisible()) {
    await dismiss.focus();
    await dismiss.press("Enter");
    await expect(dismiss).toHaveCount(0);
    await expect(page).toHaveURL(url);
    await expect(page.locator("#main")).toBeVisible();
  }
  for (const image of await page.locator("img[data-main-image], img.map").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => ({
      loaded: element.complete && element.naturalWidth > 0,
      source: element.currentSrc,
    }))).toMatchObject({ loaded: true });
  }
  await expect.poll(() => page.locator("img.lazy-preview").evaluateAll(images =>
    images.every(image => getComputedStyle(image).opacity === "0")
  )).toBe(true);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.locator("body").evaluate(() => new Promise(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  ));
}

async function imageSemantics(page) {
  return page.locator("img[data-main-image]").evaluateAll(images =>
    images.map(image => ({ alt: image.alt, loading: image.loading, draggable: image.draggable }))
  );
}

test("route inventory covers every published page and template", async ({ request }) => {
  const response = await request.get(new URL("/sitemap-0.xml", referenceURL).href);
  expect(response.ok()).toBe(true);
  const paths = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)]
    .map(match => new URL(match[1]).pathname);
  expect(routes.filter(route => route !== "/404.html").sort()).toEqual(paths.sort());
});

test("condition thumbnails retain hover, keyboard focus, and navigation", async ({ page, baseURL }) => {
  await preparePage(page, new URL("/conditions/", baseURL).href);
  const card = page.locator('a[href^="/conditions/"]').filter({ has: page.locator("img[data-main-image]") }).first();
  const target = await card.getAttribute("href");
  await card.hover();
  await expect(card.locator(".overlay")).toHaveCSS("opacity", "1");
  await page.mouse.move(0, 0);
  await card.focus();
  await expect(card.locator(".overlay")).toHaveCSS("opacity", "1");
  await card.press("Enter");
  await expect(page).toHaveURL(new URL(target, baseURL).href);
  await expect(page.locator("#main")).toBeVisible();
});

test("navigation remains usable at each viewport", async ({ page, baseURL }) => {
  await preparePage(page, baseURL);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) {
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
  }
  await page.locator('nav a[href="/providers/"]').first().click();
  await expect(page).toHaveURL(new URL("/providers/", baseURL).href);
  await expect(page.locator("#main")).toBeVisible();
});

test("hero background covers the complete hero before and after scrolling", async ({ page, baseURL }) => {
  await preparePage(page, baseURL);
  const header = page.locator("header").first();
  const hero = header.locator("..");
  const image = header.locator("img[data-main-image]").first();
  await expect(image).toHaveAttribute("loading", "eager");
  await expect.soft(image).toHaveAttribute("draggable", "false");
  for (const scrollY of [0, 250]) {
    await page.evaluate(y => scrollTo({ top: y, behavior: "instant" }), scrollY);
    const heroBox = await hero.boundingBox();
    const imageBox = await image.boundingBox();
    for (const dimension of ["x", "y", "width", "height"]) {
      expect(imageBox[dimension], `hero image ${dimension} at scroll ${scrollY}`).toBeCloseTo(heroBox[dimension], 0);
    }
  }
});

for (const route of routes) {
  test(`${route} matches production appearance and image accessibility`, async ({ page, context, baseURL }, testInfo) => {
    const reference = await context.newPage();
    await preparePage(reference, new URL(route, referenceURL).href);
    await preparePage(page, new URL(route, baseURL).href);
    expect.soft(await imageSemantics(page)).toEqual(await imageSemantics(reference));
    const mapSizes = target => target.locator(".mapboxgl-canvas").evaluateAll(canvases =>
      canvases.map(canvas => ({ width: canvas.clientWidth, height: canvas.clientHeight }))
    );
    expect(await mapSizes(page)).toEqual(await mapSizes(reference));
    const options = { fullPage: true, animations: "disabled" };
    const expectedPath = testInfo.outputPath("production.png");
    const actualPath = testInfo.outputPath("candidate.png");
    const expectedBuffer = await reference.screenshot({ ...options, path: expectedPath, mask: [reference.locator(".mapboxgl-canvas")] });
    const actualBuffer = await page.screenshot({ ...options, path: actualPath, mask: [page.locator(".mapboxgl-canvas")] });
    await testInfo.attach("production", { path: expectedPath, contentType: "image/png" });
    await testInfo.attach("candidate", { path: actualPath, contentType: "image/png" });
    const expected = PNG.sync.read(expectedBuffer);
    const actual = PNG.sync.read(actualBuffer);
    expect({ width: actual.width, height: actual.height }).toEqual({ width: expected.width, height: expected.height });
    const diff = new PNG({ width: expected.width, height: expected.height });
    const { default: pixelmatch } = await import("pixelmatch");
    const changedPixels = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height, { threshold: 0.1 });
    await testInfo.attach("difference", { body: PNG.sync.write(diff), contentType: "image/png" });
    const changedRatio = changedPixels / (expected.width * expected.height);
    testInfo.annotations.push({ type: "pixel-difference", description: `${changedPixels} pixels (${(changedRatio * 100).toFixed(4)}%)` });
    expect(changedRatio, `${changedPixels} visibly changed pixels`).toBeLessThanOrEqual(0.001);
    await reference.close();
  });
}
