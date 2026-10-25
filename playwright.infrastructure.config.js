const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/infrastructure",
  testMatch: "**/*.spec.js",
  timeout: 15_000,
  expect: { timeout: 2_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
