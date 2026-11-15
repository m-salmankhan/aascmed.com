require('./helpers/register-react.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const {
  StrapiDynamicZoneRenderer,
  StrapiBlocksRenderer,
} = require('../../src/components/strapi/blocks-renderer.tsx');
const { extractTableOfContents } = require('../../src/utils/strapi-toc.ts');
test('duplicate, nested and non-ASCII headings have unique anchors matching every TOC link', () => {
  const heading = (text, level = 2) => ({
    type: 'heading',
    level,
    children: [{ type: 'link', url: '/', children: [{ type: 'text', text }] }],
  });
  const content = [
    {
      __component: 'generic.rich-text',
      text: [
        heading('A'),
        heading('B'),
        heading('A'),
        heading('C'),
        heading('A-2'),
        heading('Caf\u00e9'),
        heading('\u60a3\u8005'),
        heading('!!!'),
      ],
    },
    {
      __component: 'generic.rich-text',
      text: [
        heading('A'),
        heading('\u60a3\u8005'),
        heading('Deep', 5),
        heading('Deep'),
      ],
    },
  ];
  const before = JSON.stringify(content);
  const html = renderToStaticMarkup(
    React.createElement(StrapiDynamicZoneRenderer, { content }),
  );
  const ids = [...html.matchAll(/<h[1-6][^>]* id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(ids).size, 12);
  assert.deepEqual(ids.slice(0, 5), ['a', 'b', 'a-2', 'c', 'a-2-2']);
  const toc = extractTableOfContents(content);
  for (const item of toc.flatMap((item) => [item, ...(item.items || [])]))
    assert.ok(ids.includes(item.url.slice(1)), item.url);
  assert.equal(JSON.stringify(content), before);
});

test('sanitizing malformed blocks leaves the original records and children intact', () => {
  const content = [
    { type: 'paragraph' },
    {
      type: 'list',
      format: 'unordered',
      children: [
        { type: 'list-item' },
        { type: 'list-item', children: [{ type: 'text', text: 'Keep' }] },
      ],
    },
  ];
  const before = JSON.stringify(content);
  const html = renderToStaticMarkup(
    React.createElement(StrapiBlocksRenderer, { content }),
  );
  assert.match(html, /Keep/);
  assert.equal(JSON.stringify(content), before);
});

const { BlogPostView } = require('../../src/views/blog-post.tsx');
test('BlogPostView anchors resolve every computed TOC link across rich-text components', () => {
  const heading = (text) => ({
    type: 'heading',
    level: 2,
    children: [{ type: 'text', text }],
  });
  const content = [
    {
      __component: 'generic.rich-text',
      text: [
        heading('Symptoms'),
        { type: 'paragraph', children: [{ type: 'text', text: '' }] },
      ],
    },
    {
      __component: 'generic.rich-text',
      text: [heading('Symptoms'), heading('Caf\u00e9')],
    },
  ];
  const before = JSON.stringify(content);
  const html = renderToStaticMarkup(
    React.createElement(BlogPostView, {
      pathname: '/blog/example/',
      blog: { title: 'Example', slug: 'example', content },
    }),
  );
  const ids = [...html.matchAll(/<h[1-6][^>]* id="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, ['symptoms', 'symptoms-2', 'caf\u00e9']);
  const links = extractTableOfContents(content).map((item) =>
    item.url.slice(1),
  );
  assert.deepEqual(links, ids);
  assert.equal(JSON.stringify(content), before);
});

test('existing ASCII anchors retain underscores', () => {
  const { slugify } = require('../../src/utils/strapi-toc.ts');
  assert.equal(slugify('foo_bar'), 'foo_bar');
});
