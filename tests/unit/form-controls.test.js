require('./helpers/register-react.js');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const {
  TextInput,
  TextArea,
} = require('../../src/components/forms/text-like-inputs.tsx');
const { Checkbox } = require('../../src/components/forms/checkbox.tsx');
const {
  Notice,
  ErrorNotice,
  SuccessNotice,
  InfoNotice,
} = require('../../src/components/forms/notices.tsx');

test('form-only props stay on wrappers and labels rather than native inputs', () => {
  for (const Component of [TextInput, TextArea, Checkbox]) {
    const html = renderToStaticMarkup(
      React.createElement(Component, {
        label: 'Name',
        error: 'Invalid',
        className: 'field-wrapper',
        name: 'example',
        required: true,
        ...(Component === TextInput ? { type: 'text' } : {}),
      }),
    );
    const control = html.match(/<(?:input|textarea)\b[^>]*>/)[0];
    assert.doesNotMatch(control, /(?:label|error|class)="/);
    assert.match(control, /name="example"/);
    assert.match(control, /required=""/);
    assert.match(html, /class="field-wrapper /);
    assert.match(html, /Invalid/);
  }
});

test('notice variants retain shrinkUp by default and support an explicit fade', () => {
  for (const Component of [ErrorNotice, SuccessNotice, InfoNotice]) {
    const html = renderToStaticMarkup(
      React.createElement(Component, null, 'Message'),
    );
    assert.match(html, /overflow-y:hidden/);
    assert.doesNotMatch(html, /overflow-Y/);
    assert.match(html, /Message/);
  }
  const fade = renderToStaticMarkup(
    React.createElement(
      Notice,
      { variant: 'info', transitionType: 'fade' },
      'Message',
    ),
  );
  assert.match(fade, /overflow-y:inherit/);
});
