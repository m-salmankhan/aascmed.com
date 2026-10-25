const assert = require("node:assert/strict");
const { PNG } = require("pngjs");
const { pathToFileURL } = require("node:url");

function assertRouteInventory(expected, actual) {
  assert.equal(new Set(expected).size, expected.length, "Duplicate route in tests/ui/routes.json");
  assert.equal(new Set(actual).size, actual.length, "Duplicate route in sitemap");
  assert.deepEqual([...actual].sort(), expected.filter(route => route !== "/404.html").sort(),
    "Sitemap routes differ from tests/ui/routes.json; confirm intentional content changes");
}

function sitemapLocations(xml) {
  const locations = [...xml.matchAll(/<loc>\s*(.*?)\s*<\/loc>/gs)].map(match =>
    match[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
  assert.ok(locations.length, "Sitemap is empty or has no <loc> entries");
  return locations;
}

function validateTargets(env = process.env) {
  for (const name of ["UI_BASE_URL", "UI_REFERENCE_URL"]) {
    assert.ok(env[name], `${name} must explicitly identify a matched-content deployment`);
    const url = new URL(env[name]);
    assert.ok(["http:", "https:"].includes(url.protocol), `${name} must use HTTP(S)`);
    assert.equal(url.username + url.password, "", `${name} must not contain credentials`);
    assert.equal(url.pathname, "/", `${name} must be a site root`);
    assert.equal(url.search + url.hash, "", `${name} must not contain query strings or fragments`);
  }
  assert.notEqual(new URL(env.UI_BASE_URL).href, new URL(env.UI_REFERENCE_URL).href,
    "Candidate and reference must be distinct deployments, not a self-comparison");
}

async function compareImages(expectedBuffer, actualBuffer) {
  const expected = PNG.sync.read(expectedBuffer);
  const actual = PNG.sync.read(actualBuffer);
  assert.deepEqual({ width: actual.width, height: actual.height },
    { width: expected.width, height: expected.height }, "Screenshot dimensions changed");
  const diff = new PNG({ width: expected.width, height: expected.height });
  const { default: pixelmatch } = await import(pathToFileURL(require.resolve("pixelmatch")).href);
  const changedPixels = pixelmatch(expected.data, actual.data, diff.data, expected.width, expected.height,
    { threshold: 0.1 });
  const changedRatio = changedPixels / (expected.width * expected.height);
  return { changedPixels, changedRatio, passed: changedRatio <= 0.001, diff: PNG.sync.write(diff) };
}

module.exports = { assertRouteInventory, sitemapLocations, validateTargets, compareImages };
