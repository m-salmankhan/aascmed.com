import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { contentToken } from '../../src/server/content/token.mjs';
import { previewReadiness } from '../../src/server/preview-readiness.ts';

test('mounted CMS tokens are private/nonempty and cannot conflict with plaintext credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'astro-preview-token-'));
  const path = join(directory, 'token');
  const previous = { token: process.env.STRAPI_TOKEN, file: process.env.STRAPI_TOKEN_FILE };
  try {
    delete process.env.STRAPI_TOKEN;
    delete process.env.STRAPI_TOKEN_FILE;
    assert.throws(() => contentToken(true));
    process.env.STRAPI_TOKEN = 'public-build-token';
    assert.equal(contentToken(), 'public-build-token');
    process.env.STRAPI_TOKEN_FILE = path;
    assert.throws(() => contentToken(), /configuration/);
    delete process.env.STRAPI_TOKEN;
    await writeFile(path, 'private-fixture-token\n', { mode: 0o600 });
    assert.equal(contentToken(true), 'private-fixture-token');
    await writeFile(path, '\n');
    assert.throws(() => contentToken(true));
    await writeFile(path, 'private-fixture-token');
    await chmod(path, 0o644);
    assert.throws(() => contentToken(true), /private/);
    delete process.env.STRAPI_TOKEN_FILE;
    const failed = spawnSync(process.execPath, ['scripts/start-preview.mjs'], {
      env: { ...process.env, ASTRO_CONTENT_MODE: 'draft', STRAPI_API_URL: 'https://cms.example.test' }, encoding: 'utf8',
    });
    assert.equal(failed.status, 1);
    assert.doesNotMatch(failed.stderr, /private-fixture-token|SyntaxError|ENOENT/);
  } finally {
    if (previous.token === undefined) delete process.env.STRAPI_TOKEN; else process.env.STRAPI_TOKEN = previous.token;
    if (previous.file === undefined) delete process.env.STRAPI_TOKEN_FILE; else process.env.STRAPI_TOKEN_FILE = previous.file;
    await rm(directory, { recursive: true, force: true });
  }
});

test('readiness reads a small draft response with the mounted token and returns only safe status', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'astro-preview-ready-'));
  const path = join(directory, 'token');
  await writeFile(path, 'readiness-fixture-secret', { mode: 0o600 });
  const previous = { ...process.env };
  const fetcher = globalThis.fetch;
  try {
    delete process.env.STRAPI_TOKEN;
    Object.assign(process.env, { STRAPI_API_URL: 'https://cms.example.test', STRAPI_TOKEN_FILE: path, ASTRO_CONTENT_MODE: 'draft' });
    globalThis.fetch = async (request) => {
      assert.equal(request.headers.get('authorization'), 'Bearer readiness-fixture-secret');
      assert.equal(new URL(request.url).searchParams.get('pagination[pageSize]'), '1');
      assert.equal(new URL(request.url).searchParams.get('status'), 'draft');
      return Response.json({ data: [] });
    };
    assert.equal((await previewReadiness()).status, 200);
    globalThis.fetch = async () => Response.json({ data: [{ documentId: 'saved-draft' }] });
    assert.equal((await previewReadiness()).status, 200);
    for (const status of [401, 503]) {
      let cancelled = false;
      globalThis.fetch = async () => new Response(new ReadableStream({
        start(controller) { controller.enqueue(new TextEncoder().encode('private upstream body')); },
        cancel() { cancelled = true; },
      }), { status });
      const failed = await previewReadiness();
      assert.equal(failed.status, 503);
      assert.equal(await failed.text(), 'not ready');
      assert.equal(cancelled, true, `Unread HTTP ${status} body is cancelled before returning`);
    }
  } finally {
    globalThis.fetch = fetcher;
    for (const key of ['STRAPI_TOKEN', 'STRAPI_TOKEN_FILE', 'STRAPI_API_URL', 'ASTRO_CONTENT_MODE']) {
      if (previous[key] === undefined) delete process.env[key]; else process.env[key] = previous[key];
    }
    await rm(directory, { recursive: true, force: true });
  }
});
