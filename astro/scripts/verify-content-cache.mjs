// Checks that static development reads stay fresh and only reuse the currently active build cache.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import {
  clearBuildContentCache,
  writeBuildContentCache,
} from '../src/server/content/build-content-cache.ts';
const astroRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environmentKeys = [
  'GATSBY_STRAPI_API_URL',
  'ASTRO_CONTENT_MODE',
  'ASTRO_BUILD_CONTENT_CACHE_ID',
  'ASTRO_BUILD_CONTENT_CACHE_PATH',
];
const previousEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
const previousFetch = globalThis.fetch;
const buildCaches = [];
let server;
let version = 1;
let requests = 0;
try {
  process.env.GATSBY_STRAPI_API_URL = 'https://cms.example.test/api';
  process.env.ASTRO_CONTENT_MODE = 'published';
  delete process.env.ASTRO_BUILD_CONTENT_CACHE_ID;
  delete process.env.ASTRO_BUILD_CONTENT_CACHE_PATH;
  /** Return versioned published content for the fixture's six collection requests.
   * @param {RequestInfo | URL} url Strapi collection request sent by the SDK.
   * @returns {Promise<Response>} A page containing the current blog version or an empty collection.
   */
  globalThis.fetch = async (url) => {
    requests++;
    const request = new URL(new Request(url).url);
    assert.equal(request.searchParams.get('status'), 'published');
    return Response.json({
      data: request.pathname.endsWith('/blogs')
        ? [{ documentId: 'one', slug: 'one', title: `Version ${version}` }]
        : [],
      meta: { pagination: { pageCount: 1 } },
    });
  };
  server = await createServer({
    root: astroRoot,
    configFile: false,
    server: { middlewareMode: true },
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
  });
  const { getPublishedCollections } = await server.ssrLoadModule(
    '/src/server/content/loaders.ts',
  );
  const first = await getPublishedCollections();
  version = 2;
  const second = await getPublishedCollections();
  assert.equal(first.blogs[0].title, 'Version 1');
  assert.equal(second.blogs[0].title, 'Version 2');
  assert.equal(requests, 12, 'development without a build cache reads the CMS again');
  for (const title of ['Build A', 'Build B']) {
    const buildId = randomUUID();
    const collections = { ...second, blogs: [{ ...second.blogs[0], title }] };
    const contentCachePath = await writeBuildContentCache(buildId, collections);
    buildCaches.push({ buildId, contentCachePath });
    process.env.ASTRO_BUILD_CONTENT_CACHE_ID = buildId;
    process.env.ASTRO_BUILD_CONTENT_CACHE_PATH = contentCachePath;
    assert.equal((await getPublishedCollections()).blogs[0].title, title);
  }
  assert.equal(
    requests,
    12,
    'each active build cache supplies its own collections without CMS reads',
  );
  for (const { buildId, contentCachePath } of buildCaches) {
    await clearBuildContentCache(buildId, contentCachePath);
  }
  version = 3;
  assert.equal((await getPublishedCollections()).blogs[0].title, 'Version 3');
  assert.equal(requests, 18, 'clearing the cache restores fresh development reads');
  console.log(
    'Content cache passed: development freshness, current build identity and cache cleanup.',
  );
} finally {
  globalThis.fetch = previousFetch;
  await server?.close();
  for (const { buildId, contentCachePath } of buildCaches) {
    await clearBuildContentCache(buildId, contentCachePath);
  }
  for (const [key, value] of previousEnvironment) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
