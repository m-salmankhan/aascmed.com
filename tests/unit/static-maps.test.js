require('./helpers/register-react.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const { StaticMap } = require('../../src/components/mapbox/static.tsx');

test('static maps use v12 and safe unlabelled pins for empty or unsupported initials', () => {
  for (const [label, pin] of [
    ['', 'pin-l+'],
    ['!', 'pin-l+'],
    ['?', 'pin-l+'],
    ['Aurora', 'pin-l-a+'],
    ['9th', 'pin-l-9+'],
  ]) {
    const html = renderToStaticMarkup(
      React.createElement(StaticMap, {
        label,
        latitude: 1,
        longitude: 2,
        zoom: 10,
      }),
    );
    assert.ok(html.includes('/streets-v12/static/' + pin));
    assert.ok(!html.includes('undefined noscript'));
  }
});
