import test from 'node:test';
import assert from 'node:assert/strict';
import { previewReadiness } from '../../astro/src/server/preview-readiness.ts';

test('readiness uses runtime draft credentials and fails closed on CMS errors', async () => {
  const original = { ...process.env };
  const originalFetch = globalThis.fetch;
  try {
    process.env.ASTRO_CONTENT_MODE = 'draft';
    process.env.GATSBY_STRAPI_API_URL = 'https://cms.example.com';
    process.env.STRAPI_TOKEN = 'runtime-test-token';
    globalThis.fetch = async (url, options) => {
      assert.equal(url.pathname, '/api/blogs');
      assert.equal(url.searchParams.get('status'), 'draft');
      assert.equal(options.headers.Authorization, 'Bearer runtime-test-token');
      assert.equal(options.redirect, 'error');
      assert.ok(options.signal);
      return new Response(JSON.stringify({ data: [] }), { status: 200 });
    };
    assert.equal((await previewReadiness()).status, 200);
    globalThis.fetch = async () => { throw new Error('sensitive upstream details'); };
    const failed = await previewReadiness();
    assert.equal(failed.status, 503);
    assert.equal(await failed.text(), 'not ready');
    delete process.env.STRAPI_TOKEN;
    assert.equal((await previewReadiness()).status, 503);
  } finally {
    process.env = original;
    globalThis.fetch = originalFetch;
  }
});
