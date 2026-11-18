const { test: base, expect } = require("@playwright/test");
const { installSafety } = require("./helpers");

const test = base.extend({
  badgeImages: [async ({}, use) => {
    await use(new Map());
  }, { scope: "worker" }],
  safety: [async ({ context, badgeImages }, use) => {
    const violations = await installSafety(context);
    await context.route(/^https:\/\/ilitsociety\.org\/badge\/ilit-badge-(light|dark)-sm-find-us-on(@2x)?\.png$/, async route => {
      if (route.request().method() !== "GET") return route.fallback();
      const url = route.request().url();
      // Reuse the verified public badge bytes on both deployments and across test contexts.
      if (!badgeImages.has(url)) {
        badgeImages.set(url, (async () => {
          const response = await route.fetch({ maxRetries: 2, timeout: 10000 });
          expect(response.ok(), `Badge request failed (${response.status()})`).toBe(true);
          return response.body();
        })());
      }
      try {
        await route.fulfill({ contentType: "image/png", body: await badgeImages.get(url) });
      } catch (error) {
        badgeImages.delete(url);
        await route.abort();
        throw error;
      }
    });
    await use();
    expect(violations, "Unhandled write requests were blocked; explicitly mock expected form submissions").toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect };
