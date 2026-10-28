const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const compile = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, jsxImportSource: "@emotion/react", module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  fileName: filename,
}).outputText, filename);
require.extensions[".ts"] = require.extensions[".tsx"] = compile;

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { PublicConfigProvider } = require("../../src/shared/config/public-context.tsx");
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
