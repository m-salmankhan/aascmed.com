require('./helpers/register-react.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

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
