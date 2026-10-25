const { defineConfig } = require("@playwright/test");
const { validateTargets } = require("./tests/ui/contracts");

validateTargets();

module.exports = defineConfig({
  testDir: "./tests/ui",
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 2,
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "ui-results.json" }]],
  use: {
    baseURL: new URL("/", process.env.UI_BASE_URL).href,
    serviceWorkers: "block",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "en-US",
    timezoneId: "America/Chicago",
    colorScheme: "light",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
