import assert from 'node:assert/strict';
import test from 'node:test';
import { installPreviewRefresh } from '../../astro/src/client/preview-refresh.ts';

const cmsOrigin = 'https://cms.example.test';

function iframeWindow(referrer = `${cmsOrigin}/admin/content-manager/collection-types/api::blog.blog/abc`) {
  const listeners = new Set();
  const sent = [];
  const calls = { reload: 0 };
  const parent = { postMessage: (...args) => sent.push(args) };
  const browser = {
    parent,
    document: { referrer },
    location: { reload: () => calls.reload++ },
    addEventListener: (_type, listener) => listeners.add(listener),
    removeEventListener: (_type, listener) => listeners.delete(listener),
  };
  return {
    browser,
    calls,
    sent,
    dispatch(event) { for (const listener of listeners) listener(event); },
    listenerCount: () => listeners.size,
  };
}

test('Strapi saved-update protocol announces readiness to configured CMS origins and filters messages', () => {
  const harness = iframeWindow();
  const apiOrigin = 'https://api.example.test';
  const cleanup = installPreviewRefresh(harness.browser, [cmsOrigin, apiOrigin]);
  assert.deepEqual(harness.sent, [
    [{ type: 'previewReady' }, cmsOrigin],
    [{ type: 'previewReady' }, apiOrigin],
  ]);
  assert.equal(harness.listenerCount(), 1);
  harness.dispatch({ source: {}, origin: cmsOrigin, data: { type: 'strapiUpdate' } });
  harness.dispatch({ source: harness.browser.parent, origin: 'https://attacker.test', data: { type: 'strapiUpdate' } });
  harness.dispatch({ source: harness.browser.parent, origin: cmsOrigin, data: { type: 'strapiScript' } });
  assert.equal(harness.calls.reload, 0);
  harness.dispatch({ source: harness.browser.parent, origin: cmsOrigin, data: { type: 'strapiUpdate' } });
  assert.equal(harness.calls.reload, 1);
  cleanup();
  assert.equal(harness.listenerCount(), 0);
});

test('direct-tab preview does not announce readiness or install a message listener', () => {
  const direct = iframeWindow();
  direct.browser.parent = direct.browser;
  installPreviewRefresh(direct.browser, [cmsOrigin]);
  assert.deepEqual(direct.sent, []);
  assert.equal(direct.listenerCount(), 0);
});

test('preview listener ignores messages from an unapproved iframe parent origin', () => {
  const harness = iframeWindow('https://other.example.test/');
  installPreviewRefresh(harness.browser, [cmsOrigin]);
  assert.deepEqual(harness.sent, [[{ type: 'previewReady' }, cmsOrigin]]);
  harness.dispatch({ source: harness.browser.parent, origin: 'https://other.example.test', data: { type: 'strapiUpdate' } });
  assert.equal(harness.calls.reload, 0);
});
