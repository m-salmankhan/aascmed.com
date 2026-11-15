const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/register-react.js');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { PublicConfigProvider } = require('../../src/config/public-context.tsx');
const { StaticMap } = require('../../src/components/mapbox/static.tsx');
const { API } = require('../../src/api/index.ts');

test('a React tree renders static maps with its injected public Mapbox key', () => {
  const html = renderToStaticMarkup(
    React.createElement(
      PublicConfigProvider,
      {
        value: {
          runtimeApiBaseUrl: 'https://runtime.example',
          mapboxAccessToken: 'public-test-key',
        },
      },
      React.createElement(StaticMap, {
        label: 'Aurora',
        latitude: 1,
        longitude: 2,
        zoom: 10,
        width: 50,
        alt: 'Map',
      }),
    ),
  );
  assert.match(html, /access_token=public-test-key/);
});

test('the contact client uses its explicitly supplied runtime API', async () => {
  const original = global.fetch;
  let url;
  global.fetch = async (target) => {
    url = target;
    return new Response(null, { status: 200 });
  };
  try {
    await new API('https://runtime.example').contact({});
  } finally {
    global.fetch = original;
  }
  assert.equal(url, 'https://runtime.example/contact/');
});

test('static maps use caller sizes in both the main image and no-JavaScript fallback', () => {
  const sizes = '(min-width: 90em) 300px, (min-width: 60em) 600px, 90vw';
  const html = renderToStaticMarkup(
    React.createElement(StaticMap, {
      label: 'Aurora',
      latitude: 1,
      longitude: 2,
      zoom: 10,
      width: 15,
      sizes,
    }),
  );
  const maps = html.match(/<img\b[^>]*class="map [^"]*"[^>]*>/g);
  assert.equal(maps.length, 2);
  for (const map of maps) {
    assert.ok(map.includes(`sizes="${sizes}"`));
    assert.ok(map.includes('loading="lazy"'));
  }
});
