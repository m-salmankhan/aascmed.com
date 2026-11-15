const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");
const fs = require("node:fs");
const compile = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, jsxImportSource: "@emotion/react", module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  fileName: filename,
}).outputText, filename);
require.extensions[".ts"] = require.extensions[".tsx"] = compile;

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

test('static maps use v12 and safe unlabelled pins for empty or unsupported initials', () => {
  for (const [label, pin] of [['', 'pin-l+'], ['!', 'pin-l+'], ['?', 'pin-l+'], ['Aurora', 'pin-l-a+'], ['9th', 'pin-l-9+']]) {
    const html = renderToStaticMarkup(React.createElement(StaticMap, { label, latitude: 1, longitude: 2, zoom: 10 }));
    assert.ok(html.includes('/streets-v12/static/' + pin));
    assert.ok(!html.includes('undefined noscript'));
  }
});

test('hero coalesces passive scrolling into one frame, writes refs, and honors reduced motion', () => {
  const { HeroBase } = require('../../src/components/header/hero-base.tsx');
  const original = { effect: React.useEffect, ref: React.useRef, window: global.window };
  const content = { style: {} }, overlay = { style: {} };
  const refs = [{ scrollHeight: 100 }, content, overlay];
  const listeners = new Map(), frames = new Map();
  let effect, motionChanged, id = 0;
  const motion = { matches: false, addEventListener: (_event, fn) => { motionChanged = fn; }, removeEventListener() {} };
  React.useRef = () => ({ current: refs.shift() });
  React.useEffect = fn => { effect = fn; };
  global.window = {
    scrollY: 50, matchMedia: () => motion,
    addEventListener: (type, fn, options) => { if(type === 'scroll') assert.equal(options.passive, true); listeners.set(type, fn); },
    removeEventListener: type => listeners.delete(type),
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  };
  try {
    HeroBase({ heading: 'Hero' });
    const cleanup = effect();
    for (let i = 0; i < 10; i++) listeners.get('scroll')();
    assert.equal(frames.size, 1);
    const render = frames.values().next().value; frames.clear(); render();
    assert.equal(content.style.transform, 'translate3d(0, -15%, 0)');
    assert.ok(Number(overlay.style.opacity) > 0);
    listeners.get('scroll')();
    motion.matches = true; motionChanged();
    assert.equal(frames.size, 0);
    assert.equal(content.style.transform, 'none');
    listeners.get('scroll')(); assert.equal(frames.size, 0);
    motion.matches = false; motionChanged(); assert.equal(frames.size, 1);
    cleanup(); assert.equal(frames.size, 0); assert.equal(listeners.size, 0);
  } finally { React.useEffect = original.effect; React.useRef = original.ref; global.window = original.window; }
});

test('Zocdoc only updates collapse state when its scroll threshold changes', () => {
  const { ZocDoc } = require('../../src/components/zocdoc/index.tsx');
  const original = { effect: React.useEffect, ref: React.useRef, state: React.useState, window: global.window };
  const effects = [], updates = [];
  let scroll;
  React.useEffect = fn => effects.push(fn);
  React.useRef = () => ({ current: null });
  React.useState = () => [false, value => updates.push(value)];
  global.window = { scrollY: 0, addEventListener: (type, fn, options) => { assert.equal(options.passive, true); scroll = fn; }, removeEventListener() {} };
  try {
    ZocDoc(); const cleanup = effects[0]();
    for (const y of [0, 100, 600, 601, 700, 800, 500, 0]) { window.scrollY = y; scroll(); }
    assert.deepEqual(updates, [true, false]); cleanup();
  } finally { React.useEffect = original.effect; React.useRef = original.ref; React.useState = original.state; global.window = original.window; }
});
