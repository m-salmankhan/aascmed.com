const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PNG } = require("pngjs");
const { assertRouteInventory, compareImages, sitemapLocations, validateTargets } = require("../ui/contracts");

test("route inventory rejects missing, extra and duplicate routes", () => {
  assert.doesNotThrow(() => assertRouteInventory(["/", "/blog/", "/404.html"], ["/blog/", "/"]));
  for (const actual of [["/"], ["/", "/blog/", "/extra/"], ["/", "/blog/", "/blog/"]]) {
    assert.throws(() => assertRouteInventory(["/", "/blog/", "/404.html"], actual));
  }
});

test("sitemap locations decode XML entities and reject empty inventories", () => {
  assert.deepEqual(sitemapLocations("<urlset><url><loc>https://example.test/?a=1&amp;b=2</loc></url></urlset>"),
    ["https://example.test/?a=1&b=2"]);
  assert.throws(() => sitemapLocations("<urlset/>"), /empty/i);
});

test("comparison requires two explicit, distinct HTTP targets", () => {
  assert.throws(() => validateTargets({}), /UI_BASE_URL/);
  assert.throws(() => validateTargets({ UI_BASE_URL: "https://candidate.test" }), /UI_REFERENCE_URL/);
  assert.throws(() => validateTargets({ UI_BASE_URL: "https://same.test", UI_REFERENCE_URL: "https://same.test/" }), /distinct/);
  assert.throws(() => validateTargets({ UI_BASE_URL: "file:///tmp/site", UI_REFERENCE_URL: "https://base.test" }), /HTTP/);
  assert.throws(() => validateTargets({ UI_BASE_URL: "https://user:secret@candidate.test", UI_REFERENCE_URL: "https://base.test" }), /credentials/);
  assert.throws(() => validateTargets({ UI_BASE_URL: "https://candidate.test/subpath/", UI_REFERENCE_URL: "https://base.test" }), /root/);
  assert.doesNotThrow(() => validateTargets({ UI_BASE_URL: "http://localhost:9000", UI_REFERENCE_URL: "http://localhost:9001" }));
});

function image(width, height, changed = 0) {
  const png = new PNG({ width, height });
  png.data.fill(255);
  for (let pixel = 0; pixel < changed; pixel++) {
    png.data[pixel * 4] = 0;
    png.data[pixel * 4 + 1] = 0;
    png.data[pixel * 4 + 2] = 0;
  }
  return PNG.sync.write(png);
}

test("visual threshold accepts exactly 0.1% and rejects more", async () => {
  const baseline = image(100, 100);
  assert.equal((await compareImages(baseline, baseline)).passed, true);
  assert.equal((await compareImages(baseline, image(100, 100, 10))).passed, true);
  assert.equal((await compareImages(baseline, image(100, 100, 11))).passed, false);
});

test("visual dimension changes produce a clear failure rather than a pixelmatch crash", async () => {
  await assert.rejects(() => compareImages(image(100, 100), image(101, 100)), /dimensions/);
});
