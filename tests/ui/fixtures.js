const { test: base, expect } = require("@playwright/test");
const { installSafety } = require("./helpers");

const test = base.extend({
  badgeImages: [async ({ playwright }, use) => {
    const request = await playwright.request.newContext();
    const urls = ["light", "dark"].map(variant =>
      `https://ilitsociety.org/badge/ilit-badge-${variant}-sm-find-us-on.png`);
    let images;
    try {
      images = await Promise.all(urls.map(async url => {
        const response = await request.get(url, { maxRetries: 2, timeout: 10000 })
          .catch(() => request.get(url, { maxRetries: 2, timeout: 10000 }));
        expect(response.ok(), `Badge request failed (${response.status()}): ${url}`).toBe(true);
        return [url, await response.body()];
      }));
    } finally {
      await request.dispose();
    }
    await use(new Map(images));
  }, { scope: "worker" }],
  safety: [async ({ context, badgeImages }, use) => {
    const violations = await installSafety(context);
    await context.route(url => badgeImages.has(url.href), async route => {
      if (route.request().method() !== "GET") return route.fallback();
      await route.fulfill({ contentType: "image/png", body: badgeImages.get(route.request().url()) });
    });
    await use();
    expect(violations, "Unhandled write requests were blocked; explicitly mock expected form submissions").toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect };
