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

const { StrapiDynamicZoneRenderer, StrapiBlocksRenderer } = require('../../src/components/strapi/blocks-renderer.tsx');
const { extractTableOfContents } = require('../../src/utils/strapi-toc.ts');
test('duplicate, nested and non-ASCII headings have unique anchors matching every TOC link', () => {
  const heading = (text, level = 2) => ({ type: 'heading', level, children: [{ type: 'link', url: '/', children: [{ type: 'text', text }] }] });
  const content = [
    { __component: 'generic.rich-text', text: [heading('A'), heading('B'), heading('A'), heading('C'), heading('A-2'), heading('Caf\u00e9'), heading('\u60a3\u8005'), heading('!!!')] },
    { __component: 'generic.rich-text', text: [heading('A'), heading('\u60a3\u8005'), heading('Deep', 5), heading('Deep')] },
  ];
  const before = JSON.stringify(content);
  const html = renderToStaticMarkup(React.createElement(StrapiDynamicZoneRenderer, { content }));
  const ids = [...html.matchAll(/<h[1-6][^>]* id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, 12);
  assert.deepEqual(ids.slice(0, 5), ['a', 'b', 'a-2', 'c', 'a-2-2']);
  const toc = extractTableOfContents(content);
  for (const item of toc.flatMap(item => [item, ...(item.items || [])])) assert.ok(ids.includes(item.url.slice(1)), item.url);
  assert.equal(JSON.stringify(content), before);
});

test('sanitizing malformed blocks leaves the original records and children intact', () => {
  const content = [{ type: 'paragraph' }, { type: 'list', format: 'unordered', children: [{ type: 'list-item' }, { type: 'list-item', children: [{ type: 'text', text: 'Keep' }] }] }];
  const before = JSON.stringify(content);
  const html = renderToStaticMarkup(React.createElement(StrapiBlocksRenderer, { content }));
  assert.match(html, /Keep/);
  assert.equal(JSON.stringify(content), before);
});
