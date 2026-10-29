// Checks lazy CMS reads and reuse of compact route references during the current static build.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const astroRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const environmentKeys = [
  'GATSBY_STRAPI_API_URL',
  'ASTRO_CONTENT_MODE',
  'ASTRO_BUILD_IMAGE_MANIFEST_ID',
  'ASTRO_BUILD_IMAGE_MANIFEST_PATH',
];
const previousEnvironment = new Map(environmentKeys.map((key) => [key, process.env[key]]));
const previousFetch = globalThis.fetch;
const files = [];
const requests = [];
let server;
let version = 1;
try {
  process.env.GATSBY_STRAPI_API_URL = 'https://cms.example.test/api';
  process.env.ASTRO_CONTENT_MODE = 'published';
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID;
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
  /** Return bounded published pages while recording which collection the consumer requested.
   * @param {RequestInfo | URL} input SDK request for a published collection.
   * @returns {Promise<Response>} One small blog page, or an empty collection page.
   */
  globalThis.fetch = async (input) => {
    const request = new URL(new Request(input).url);
    requests.push(request);
    assert.equal(request.searchParams.get('status'), 'published');
    const page = Number(request.searchParams.get('pagination[page]'));
    const isBlog = request.pathname.endsWith('/blogs');
    return Response.json({
      data: isBlog
        ? [
            {
              documentId: `blog-${page}`,
              slug: `entry-${version}-${page}`,
              title: `Version ${version}`,
            },
          ]
        : [],
      meta: { pagination: { pageCount: isBlog ? 2 : 1 } },
    });
  };
  server = await createServer({
    root: astroRoot,
    configFile: false,
    server: { middlewareMode: true },
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
  });
  const { getPublishedCollections } = await server.ssrLoadModule('/src/server/content/loaders.ts');
  const { getPublishedRouteManifest } = await server.ssrLoadModule('/src/server/content/routes.ts');
  const first = await getPublishedCollections({ pageSize: 1 });
  assert.equal(requests.length, 0, 'constructing the collection iterators makes no CMS request');
  const firstBlogs = first.blogs[Symbol.asyncIterator]();
  assert.equal((await firstBlogs.next()).value.title, 'Version 1');
  assert.equal(requests.length, 1);
  await firstBlogs.return();
  assert.equal(requests.length, 1, 'closing after the first record does not request page two');
  version = 2;
  const second = await getPublishedCollections({ pageSize: 1 });
  const secondBlogs = second.blogs[Symbol.asyncIterator]();
  assert.equal((await secondBlogs.next()).value.title, 'Version 2');
  await secondBlogs.return();
  assert.equal(
    requests.length,
    2,
    'a new reader sees fresh content without consuming other collections',
  );
  assert.ok(requests.every((request) => request.pathname.endsWith('/blogs')));
  for (const slug of ['build-a', 'build-b']) {
    const buildId = randomUUID();
    const manifestPath = path.resolve(
      process.cwd(),
      '.astro',
      'public-image-manifests',
      `${buildId}.json`,
    );
    const routes = [{ pathname: `/blog/${slug}/`, kind: 'blog' }];
    await mkdir(path.dirname(manifestPath), { recursive: true, mode: 0o700 });
    await writeFile(
      manifestPath,
      JSON.stringify({ version: 1, buildId, result: { cards: [], mediaByRoute: {}, routes } }),
      { mode: 0o600 },
    );
    files.push(manifestPath);
    process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID = buildId;
    process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH = manifestPath;
    assert.deepEqual(await getPublishedRouteManifest(), routes);
  }
  assert.equal(requests.length, 2, 'sitemaps reuse route references without another content fetch');
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID;
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
  version = 3;
  assert.deepEqual(
    (await getPublishedRouteManifest()).map((route) => route.pathname),
    ['/blog/entry-3-1/', '/blog/entry-3-2/'],
  );
  assert.ok(
    !requests.some((request) => request.pathname.endsWith('/reviews')),
    'route generation never consumes the review stream',
  );
  console.log(
    'Lazy content passed: bounded on-demand reads, early exit, fresh readers and per-build compact route indexes.',
  );
} finally {
  globalThis.fetch = previousFetch;
  await server?.close();
  for (const file of files) {
    await rm(file, { force: true });
  }
  for (const [key, value] of previousEnvironment) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
