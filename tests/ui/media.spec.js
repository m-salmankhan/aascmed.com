const { test, expect } = require("./fixtures");
const { preparePage, readSitemap } = require("./helpers");
const { assertRouteInventory } = require("./contracts");
const { comparePages } = require("./comparison");

const referenceURL = new URL(process.env.UI_REFERENCE_URL).href;
const routes = require("./routes.json");

test("route inventory covers every published page on both deployments", async ({ request, baseURL }) => {
  for (const target of [referenceURL, baseURL]) {
    assertRouteInventory(routes, await readSitemap(request, target));
  }
});

test("condition thumbnails retain hover, keyboard focus, and navigation", async ({ page, baseURL }) => {
  await preparePage(page, new URL("/conditions/", baseURL).href);
  const card = page.locator('#main a[href^="/conditions/"]').filter({ has: page.locator("img") }).first();
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
  const image = header.locator('img:not([aria-hidden="true"]):not([role="presentation"])').first();
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
  test(`${route} matches reference content, metadata, links, forms and appearance`, async ({ page, context, baseURL }, testInfo) => {
    const reference = await context.newPage();
    await preparePage(reference, new URL(route, referenceURL).href);
    await preparePage(page, new URL(route, baseURL).href);
    await comparePages(reference, page, testInfo);
    await reference.close();
  });
}
