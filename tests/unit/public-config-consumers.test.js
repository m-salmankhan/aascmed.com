const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const compile = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, jsxImportSource: "@emotion/react", module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  fileName: filename,
}).outputText, filename);
require.extensions[".ts"] = require.extensions[".tsx"] = compile;

// Vite's asset URL imports are opaque strings in these server-rendered unit tests.
const Module = require('node:module');
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (request.endsWith('?url')) return request.slice(0, -4);
  return load.call(this, request, parent, isMain);
};
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { PublicConfigProvider } = require("../../src/config/public-context.tsx");
const { StaticMap } = require("../../src/components/mapbox/static.tsx");
const { API } = require("../../src/api/index.ts");

test("a React tree renders static maps with its injected public Mapbox key", () => {
  const html = renderToStaticMarkup(React.createElement(PublicConfigProvider, {
    value: { runtimeApiBaseUrl: "https://runtime.example", mapboxAccessToken: "public-test-key" },
  }, React.createElement(StaticMap, { label: "Aurora", latitude: 1, longitude: 2, zoom: 10, width: 50, alt: "Map" })));
  assert.match(html, /access_token=public-test-key/);
});

test("the contact client uses its explicitly supplied runtime API", async () => {
  const original = global.fetch;
  let url;
  global.fetch = async (target) => { url = target; return { status: 200, json: async () => ({}) }; };
  try { await new API("https://runtime.example").contact({}); }
  finally { global.fetch = original; }
  assert.equal(url, "https://runtime.example/contact/");
});

test("static maps use caller sizes in both the main image and no-JavaScript fallback", () => {
  const sizes = "(min-width: 90em) 300px, (min-width: 60em) 600px, 90vw";
  const html = renderToStaticMarkup(React.createElement(StaticMap, {
    label: "Aurora", latitude: 1, longitude: 2, zoom: 10, width: 15, sizes,
  }));
  const maps = html.match(/<img\b[^>]*class="map [^"]*"[^>]*>/g);
  assert.equal(maps.length, 2);
  for (const map of maps) {
    assert.ok(map.includes(`sizes="${sizes}"`));
    assert.ok(map.includes('loading="lazy"'));
  }
});

const { StrapiFAQ } = require('../../src/components/strapi/faq.tsx');
test('FAQ JSON-LD escapes closing script tags and includes nested answer text', () => {
  const text = '</script><script>alert(1)</script>';
  const questions = [{ question: 'Safe?', answer: [{ type: 'paragraph', children: [
    { type: 'text', text: 'Read ' },
    { type: 'link', url: '/', children: [{ type: 'text', text }] },
  ] }] }];
  const html = renderToStaticMarkup(React.createElement(StrapiFAQ, { questions }));
  const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.ok(!scripts[0][1].includes('<'));
  assert.equal(JSON.parse(scripts[0][1]).mainEntity[0].acceptedAnswer.text, 'Read ' + text);
  assert.ok(!html.includes('<script>alert(1)'));
});
