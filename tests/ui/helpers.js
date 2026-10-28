const { expect } = require("@playwright/test");
const { sitemapLocations } = require("./contracts");

const imageSelector = 'header img:not([aria-hidden="true"]):not([role="presentation"]), #main img:not([aria-hidden="true"]):not([role="presentation"])';

async function installSafety(context) {
  const violations = [];
  await context.route("**/*", async route => {
    const request = route.request();
    if (/zocdoc\.com|netlify\.com|netlify\.app\/\.netlify|google-analytics\.com|googletagmanager\.com|facebook\.com|facebook\.net|events\.mapbox\.com/.test(request.url())) {
      await route.abort("blockedbyclient");
      return;
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      const url = new URL(request.url());
      violations.push(`${request.method()} ${url.origin}${url.pathname}`);
      await route.abort("blockedbyclient");
      return;
    }
    await route.fallback();
  });
  return violations;
}

async function openPage(page, url) {
  const response = await page.goto(url, { waitUntil: "load" });
  expect(response, `No HTTP response for ${url}`).not.toBeNull();
  expect(url.endsWith("/404.html") ? [200, 404] : [200]).toContain(response.status());
  await expect(page).toHaveURL(url);
  await expect(page.locator("header").first()).toBeVisible();
  await expect(page.locator("#main")).toBeVisible();
  await expect(page.locator("#main")).not.toHaveText("");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => dispatchEvent(new Event("resize")));
}

async function preparePage(page, url) {
  await openPage(page, url);
  const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
  if (await dismiss.count()) {
    await dismissBooking(page);
    await expect(page).toHaveURL(url);
  }
  for (const image of await page.locator(imageSelector).all()) {
    if (!await image.isVisible()) continue;
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => element.complete && element.naturalWidth > 0),
      { message: `Image failed to load on ${url}: ${await image.getAttribute("alt")}` }).toBe(true);
    await image.evaluate(element => element.decode());
  }
  await expect.poll(() => page.locator("img.lazy-preview").evaluateAll(images =>
    images.every(image => getComputedStyle(image).opacity === "0")
  )).toBe(true);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function dismissBooking(page) {
  // The shared booking component injects this script only after its handlers are attached.
  await expect(page.locator('script[src="https://offsiteschedule.zocdoc.com/plugin/embed"]')).toBeAttached();
  const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
  await dismiss.focus();
  await dismiss.press("Enter");
  await expect(dismiss).toHaveCount(0);
}

async function semanticImages(page) {
  return page.locator(imageSelector).evaluateAll(images => images.map(image => ({
    alt: image.getAttribute("alt"), loading: image.loading, draggable: image.draggable,
  })));
}

async function pageContract(page) {
  return page.evaluate(() => {
    const text = value => value.replace(/\s+/g, " ").trim();
    const canonical = document.querySelector('link[rel="canonical"]')?.href;
    const localURL = value => {
      const url = new URL(value, location.href);
      if (url.origin === location.origin || (canonical && url.origin === new URL(canonical).origin)) {
        return url.pathname + url.search + url.hash;
      }
      return url.href;
    };
    const main = document.querySelector("#main").cloneNode(true);
    main.querySelectorAll("script, style, noscript, .map-container, .mapboxgl-map").forEach(element => element.remove());
    const meta = selector => [...document.querySelectorAll(selector)].map(element =>
      [element.getAttribute("name") || element.getAttribute("property"), element.getAttribute("content")]).sort();
    return {
      metadata: {
        title: document.title, canonical,
        language: document.documentElement.lang,
        tags: meta('meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"]'),
        structuredData: [...document.querySelectorAll('script[type="application/ld+json"]')].map(element => JSON.parse(element.textContent)),
      },
      headings: [...document.querySelectorAll("#main h1, #main h2, #main h3, #main h4, #main h5, #main h6")]
        .map(element => [element.tagName, element.id, text(element.textContent)]),
      content: text(main.textContent),
      links: [...document.querySelectorAll("nav a, #main a, footer a")]
        .filter(element => !element.closest("noscript, .map-container, .mapboxgl-map"))
        .map(element => {
          const anchor = element.cloneNode(true);
          anchor.querySelectorAll("script, style, noscript").forEach(fallback => fallback.remove());
          return { text: text(anchor.textContent), href: localURL(element.getAttribute("href")) };
        }),
      forms: [...document.querySelectorAll("#main input, #main select, #main textarea, #main button[type=submit]")]
        .map(element => ({
          tag: element.tagName, name: element.name, type: element.type, required: element.required || false,
          value: element.type === "hidden" || element.tagName === "SELECT" ? element.value : undefined,
          options: element.tagName === "SELECT" ? [...element.options].map(option => [option.value, text(option.text)]) : undefined,
        })),
    };
  });
}

async function readSitemap(request, baseURL) {
  const path = process.env.UI_SITEMAP_PATH || "/sitemap-index.xml";
  const response = await request.get(new URL(path, baseURL).href);
  expect(response.ok(), `Sitemap failed: ${response.url()} (${response.status()})`).toBe(true);
  const xml = await response.text();
  const locations = sitemapLocations(xml);
  if (!/<sitemapindex[\s>]/.test(xml)) return locations.map(url => new URL(url).pathname);
  const paths = [];
  for (const location of locations) {
    // Sitemap hostnames are canonical even when testing a preview deployment.
    const child = await request.get(new URL(new URL(location).pathname, baseURL).href);
    expect(child.ok(), `Sitemap failed: ${child.url()} (${child.status()})`).toBe(true);
    paths.push(...sitemapLocations(await child.text()).map(url => new URL(url).pathname));
  }
  return paths;
}

module.exports = { imageSelector, installSafety, openPage, preparePage, dismissBooking, semanticImages, pageContract, readSitemap };
