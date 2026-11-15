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
  global.fetch = async (target) => { url = target; return new Response(null, { status: 200 }); };
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

async function contactResponse(response) {
  const original = global.fetch;
  global.fetch = async () => response;
  try { return await new API("https://runtime.example").contact({}); }
  finally { global.fetch = original; }
}

test("contact success depends strictly on HTTP ok, including empty responses", async () => {
  assert.deepEqual(await contactResponse(new Response(null, { status: 200 })), { ok: true });
  assert.deepEqual(await contactResponse(new Response(null, { status: 204 })), { ok: true });
});

test("contact rejects JSON and HTML errors without false success", async () => {
  const fields = { email_address: ['Invalid email'] };
  const result = await contactResponse(Response.json({ detail: { field_errors: fields, error: null } }, { status: 400 }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.field_errors, fields);
  const html = await contactResponse(new Response('<html>Bad request</html>', { status: 400 }));
  assert.equal(html.ok, false);
  assert.ok(html.error);
  const server = await contactResponse(Response.json({ detail: { error: 'Delivery failed' } }, { status: 500 }));
  assert.equal(server.ok, false);
  assert.equal(server.error, 'Delivery failed');
});

test("FastAPI 422 validation maps known body fields and ignores malformed details", async () => {
  const result = await contactResponse(Response.json({ detail: [
    { loc: ['body', 'email_address'], msg: 'Required' },
    { loc: ['body', 'email_address'], msg: 'Invalid' },
    { loc: ['body', 'newPatient'], msg: 'Boolean required' },
    { loc: ['query', 'subject'], msg: 'Wrong scope' },
    { loc: ['body', '__proto__'], msg: 'Unknown' },
    { loc: ['body', 'subject'], msg: {} }, null,
  ] }, { status: 422 }));
  assert.equal(result.ok, false);
  assert.deepEqual(result.field_errors, { email_address: ['Required', 'Invalid'], new_patient: ['Boolean required'] });
  const malformed = await contactResponse(Response.json({ detail: null }, { status: 422 }));
  assert.equal(malformed.ok, false);
  assert.ok(malformed.error);
});

test("contact bounds fetch to 15 seconds and returns timeout and network failures", async () => {
  const originalFetch = global.fetch;
  const originalTimeout = AbortSignal.timeout;
  let duration;
  const signal = AbortSignal.abort(new DOMException('Timed out', 'TimeoutError'));
  AbortSignal.timeout = ms => { duration = ms; return signal; };
  try {
    global.fetch = async (_url, options) => { assert.equal(options.signal, signal); options.signal.throwIfAborted(); };
    const timeout = await new API('https://runtime.example').contact({});
    assert.equal(duration, 15000);
    assert.equal(timeout.ok, false);
    assert.match(timeout.error, /timed out/);
    global.fetch = async () => { throw new TypeError('Network unavailable'); };
    const network = await new API('https://runtime.example').contact({});
    assert.equal(network.ok, false);
    assert.ok(network.error);
  } finally { global.fetch = originalFetch; AbortSignal.timeout = originalTimeout; }
});
