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

const { TextInput, TextArea } = require('../../src/components/forms/text-like-inputs.tsx');
const { Checkbox } = require('../../src/components/forms/checkbox.tsx');
const { Notice, ErrorNotice, SuccessNotice, InfoNotice } = require('../../src/components/forms/notices.tsx');

test('form-only props stay on wrappers and labels rather than native inputs', () => {
  for (const Component of [TextInput, TextArea, Checkbox]) {
    const html = renderToStaticMarkup(React.createElement(Component, {
      label: 'Name', error: 'Invalid', className: 'field-wrapper', name: 'example', required: true,
      ...(Component === TextInput ? { type: 'text' } : {}),
    }));
    const control = html.match(/<(?:input|textarea)\b[^>]*>/)[0];
    assert.doesNotMatch(control, /(?:label|error|class)="/);
    assert.match(control, /name="example"/);
    assert.match(control, /required=""/);
    assert.match(html, /class="field-wrapper /);
    assert.match(html, /Invalid/);
  }
});

test('notice variants share the default fade and valid overflow styles', () => {
  for (const Component of [ErrorNotice, SuccessNotice, InfoNotice]) {
    const html = renderToStaticMarkup(React.createElement(Component, null, 'Message'));
    assert.match(html, /overflow-y:inherit/);
    assert.doesNotMatch(html, /overflow-Y/);
    assert.match(html, /Message/);
  }
  const shrink = renderToStaticMarkup(React.createElement(Notice, { variant: 'info', transitionType: 'shrinkUp' }, 'Message'));
  assert.match(shrink, /overflow-y:hidden/);
});

test('contact submits from its async handler once even before React rerenders', async () => {
  const { ContactForm } = require('../../src/components/contact/index.tsx');
  const original = { useState: React.useState, useRef: React.useRef, useContext: React.useContext, FormData: global.FormData, window: global.window, fetch: global.fetch, log: console.log };
  const updates = [];
  let calls = 0;
  let resolve;
  React.useState = value => [value, next => updates.push(next)];
  React.useRef = value => ({ current: value });
  React.useContext = () => ({ runtimeApiBaseUrl: 'https://runtime.example' });
  global.FormData = class extends Map { constructor() { super([['fullname', 'Example'], ['clinic', 'Clinic']]); } };
  global.window = { location: { href: 'https://www.aascmed.com/contact/' } };
  console.log = () => {};
  global.fetch = async (_url, options) => { calls++; assert.equal(JSON.parse(options.body).full_name, 'Example'); await new Promise(done => { resolve = done; }); return new Response(null, { status: 200 }); };
  try {
    const tree = ContactForm({ clinic: 'Clinic' });
    const form = tree.props.children.find(child => typeof child?.props?.onSubmit === 'function');
    const event = { preventDefault() {}, currentTarget: {} };
    const pending = form.props.onSubmit(event);
    await form.props.onSubmit(event);
    assert.equal(calls, 1);
    resolve(undefined);
    await pending;
    assert.ok(updates.includes(2), 'success state set without an effect');
  } finally {
    React.useState = original.useState; React.useRef = original.useRef; React.useContext = original.useContext;
    global.FormData = original.FormData; global.window = original.window; global.fetch = original.fetch; console.log = original.log;
  }
});
