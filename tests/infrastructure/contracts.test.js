const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { resolve } = require("node:path");
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

test("comparison rejects same-origin aliases with empty query or fragment delimiters", () => {
  const aliases = [
    "https://candidate.test/",
    "https://candidate.test/#",
    "https://candidate.test/?",
    "https://candidate.test/?#",
    "https://CANDIDATE.test:443/?",
  ];
  for (const candidate of aliases) {
    for (const reference of aliases) {
      assert.throws(() => validateTargets({
        UI_BASE_URL: candidate,
        UI_REFERENCE_URL: reference,
      }), /distinct/, `${candidate} and ${reference} identify the same comparison target`);
    }
  }
  assert.doesNotThrow(() => validateTargets({
    UI_BASE_URL: "https://candidate.test/#",
    UI_REFERENCE_URL: "https://reference.test/?",
  }));
});

test("Playwright base URL matches home navigation for accepted root aliases", () => {
  for (const [candidate, home] of [
    ["https://candidate.test", "https://candidate.test/"],
    ["https://candidate.test/", "https://candidate.test/"],
    ["https://candidate.test/#", "https://candidate.test/"],
    ["https://candidate.test/?", "https://candidate.test/"],
    ["https://candidate.test/?#", "https://candidate.test/"],
    ["https://CANDIDATE.test:443/?", "https://candidate.test/"],
    ["http://localhost:9000/?#", "http://localhost:9000/"],
  ]) {
    const baseURL = execFileSync(process.execPath,
      ["-e", 'process.stdout.write(require("./playwright.config").use.baseURL)'], {
        cwd: resolve(__dirname, "../.."),
        env: { ...process.env, UI_BASE_URL: candidate, UI_REFERENCE_URL: "https://reference.test/?#" },
        encoding: "utf8",
      });
    assert.equal(baseURL, home, `${candidate} must match the URL reached by the home link`);
  }
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

test("visual dimension changes are reportable differences rather than comparison errors", async () => {
  const result = await compareImages(image(100, 100), image(101, 100));
  assert.equal(result.passed, false);
  assert.deepEqual(result.dimensions, {
    expected: { width: 100, height: 100 },
    actual: { width: 101, height: 100 },
  });
  assert.equal(result.diff, undefined);
});

test("invalid screenshot data remains a hard comparison error", async () => {
  await assert.rejects(() => compareImages(image(100, 100), Buffer.from("not a PNG")));
});
