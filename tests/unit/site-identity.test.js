require('./helpers/register-react.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const { useSiteMetadata } = require('../../src/hooks/useSiteMetadata.ts');
const { siteSettings } = require('../../src/config/site.ts');
const { SiteDataProvider } = require('../../src/data/site-data.tsx');
test('site identity defaults agree with the configured public site', () => {
  function Metadata() {
    return React.createElement('span', null, JSON.stringify(useSiteMetadata()));
  }
  const normal = renderToStaticMarkup(React.createElement(Metadata));
  const empty = renderToStaticMarkup(
    React.createElement(
      SiteDataProvider,
      { value: { siteSettings: { title: '', url: '' } } },
      React.createElement(Metadata),
    ),
  );
  for (const html of [normal, empty]) {
    assert.ok(html.includes(siteSettings.title));
    assert.ok(html.includes(siteSettings.url));
    assert.ok(!html.includes('Untitled Site'));
  }
});
