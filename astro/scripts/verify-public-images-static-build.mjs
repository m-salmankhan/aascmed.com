// Mocked Strapi static-build fixture for image output, sitemap collection reuse, and secret isolation.
import './verify-content-cache.mjs';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
/** @typedef {import('../src/server/content/loaders.ts').PublishedCollections} PublishedCollections */
const astroRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(astroRoot, 'src', 'pages', 'public-image-fixture.astro');
const configPath = path.join(astroRoot, 'astro.config.public-images-fixture.mjs');
const outputDir = path.join(astroRoot, 'dist-public-images-fixture');
const stagingDir = path.join(astroRoot, '.astro', 'public-images-fixture');
const cacheDir = path.join(astroRoot, '.astro', 'public-image-cache-fixture');
const staleId = randomUUID();
const stalePath = path.join(astroRoot, '.astro', 'public-image-manifests', `${staleId}.json`);
/** Create the mock CMS image body for the current public-build fixture.
 * @param {string} color CSS rectangle fill returned by the mock media endpoint.
 * @returns {string} Deterministic SVG response text.
 */
const svg = (color) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${color}"/></svg>`;
};
let imageColor = '#df4b31';
let blogTitle = 'Fixture version one';
const requests = [];
/** Check whether a fixture path exists without changing the filesystem.
 * @param {string} target Absolute path checked before writing test artifacts.
 * @returns Promise<boolean> True when the target already exists.
 */
async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}
/** Scan the public output recursively for build-only IDs, paths, or the sentinel server token.
 * @param {string} directory Public build directory to inspect.
 * @returns Promise<void>; throws at the first public file containing a forbidden build value.
 */
async function assertPublicOutputContainsNoBuildSecrets(directory) {
  for (const entry of await import('node:fs/promises').then(({ readdir }) =>
    readdir(directory, { withFileTypes: true }),
  )) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await assertPublicOutputContainsNoBuildSecrets(fullPath);
    } else {
      const body = (await readFile(fullPath)).toString('utf8');
      assert.doesNotMatch(
        body,
        /fixture-server-secret-never-publish|ASTRO_BUILD_IMAGE_MANIFEST_(?:ID|PATH)|rich-text-must-not-be-retained/,
      );
    }
  }
}
for (const target of [routePath, configPath, outputDir, stagingDir, cacheDir, stalePath]) {
  assert.equal(
    await exists(target),
    false,
    `Refusing to overwrite existing fixture path: ${target}`,
  );
}
const mockApi = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/uploads/cover.svg') {
    response.writeHead(200, {
      'content-type': 'image/svg+xml',
      'content-length': Buffer.byteLength(svg(imageColor)),
    });
    response.end(svg(imageColor));
    return;
  }
  const kind = url.pathname.split('/').filter(Boolean).at(-1);
  if (!['blogs', 'clinics', 'conditions', 'providers', 'service-updates'].includes(kind)) {
    response.writeHead(404);
    response.end();
    return;
  }
  const page = Number(url.searchParams.get('pagination[page]') || 1);
  requests.push({ kind, page, status: url.searchParams.get('status') });
  if (kind === 'blogs' && page === 2) {
    assert.ok(
      await stat(path.join(stagingDir, 'og-images/blog/fixture-post-cover.jpg')),
      'the first CMS page is processed before the next page is requested',
    );
    const derivatives = await readdir(path.join(stagingDir, 'media'));
    for (const extension of ['.avif', '.webp', '.jpg']) {
      assert.ok(
        derivatives.some((name) => name.endsWith(extension)),
        'responsive derivatives exist before the next CMS page is fetched',
      );
    }
  }
  const records =
    kind === 'blogs'
      ? [
          {
            id: 1,
            documentId: 'fixture-blog',
            slug: 'fixture-post',
            title: blogTitle,
            heading: blogTitle,
            thumbnail: { url: '/uploads/cover.svg', alternativeText: 'Fixture cover' },
            content: [{ text: 'rich-text-must-not-be-retained' }],
          },
          { id: 2, documentId: 'fixture-blog-two', slug: 'fixture-second', title: 'Second post' },
          { id: 3, documentId: 'fixture-blog-three', slug: 'fixture-third', title: 'Third post' },
        ]
      : [];
  const data = records.slice((page - 1) * 2, page * 2);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(
    JSON.stringify({
      data,
      meta: {
        pagination: {
          pageCount: Math.max(1, Math.ceil(records.length / 2)),
          total: records.length,
        },
      },
    }),
  );
});
await new Promise((resolve) => mockApi.listen(0, '127.0.0.1', resolve));
const address = mockApi.address();
assert.ok(address && typeof address === 'object');
const fixtureRoute = `
---
import { getPublishedRouteManifest } from '../server/content/routes.ts';
import { getPublishedImageManifest } from '../server/content/public-images.ts';
const routes = await getPublishedRouteManifest();
const images = await getPublishedImageManifest();
const card = images?.cards.find(({ slug }) => slug === 'fixture-post');
const media = images?.mediaByRoute['blog:fixture-post'];
---
<html><body>
  <span id="route-count">{routes.length}</span>
  <div id="card" data-image-path={card?.imagePath} data-cached={String(card?.wasCached)}></div>
  <img id="responsive" src={media?.src} srcset={media?.formats?.find(({ type }) => type === 'image/webp')?.srcSet} />
</body></html>
`;
const fixtureConfig = `
import base from './astro.config.static.mjs';
import { publicImagesIntegration } from './src/integrations/public-images.ts';
import path from 'node:path';
const integration = publicImagesIntegration({
  loadPublishedCollections: async () => {
    const { getPublishedCollections } = await import('./src/server/content/loaders.ts');
    return getPublishedCollections({ pageSize: 2 });
  },
  stagingDir: path.resolve('.astro/public-images-fixture'),
  cacheDir: path.resolve('.astro/public-image-cache-fixture'),
});
const integrations = base.integrations.filter((item) => item.name !== 'aasc-public-images');
export default { ...base, outDir: './dist-public-images-fixture', integrations: [...integrations, integration] };
`;
/** Run one isolated Astro static build and assert each published collection is requested once.
 * @returns Promise<number> Number of CMS collection requests served during the build.
 */
const runStaticBuild = async () => {
  const startIndex = requests.length;
  const cli = path.join(astroRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const build = spawn(process.execPath, [cli, 'build', '--config', path.basename(configPath)], {
    cwd: astroRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      ASTRO_CONTENT_MODE: 'published',
      GATSBY_STRAPI_API_URL: `http://127.0.0.1:${address.port}/api`,
      STRAPI_TOKEN: 'fixture-server-secret-never-publish',
    },
  });
  const code = await new Promise((resolve, reject) => {
    build.once('error', reject);
    build.once('close', resolve);
  });
  assert.equal(code, 0, 'Astro static fixture build succeeds');
  const buildRequests = requests.slice(startIndex);
  const expectedKinds = ['blogs', 'clinics', 'conditions', 'providers', 'service-updates'];
  assert.deepEqual(new Set(buildRequests.map(({ kind }) => kind)), new Set(expectedKinds));
  assert.ok(
    buildRequests.every(({ status }) => status === 'published'),
    'build reads only published CMS collections',
  );
  for (const kind of expectedKinds) {
    assert.equal(
      buildRequests.filter((request) => request.kind === kind).length,
      kind === 'blogs' ? 2 : 1,
      `${kind} is read once, page by page, across image and sitemap builds`,
    );
  }
  return buildRequests.length;
};
try {
  await mkdir(path.dirname(stalePath), { recursive: true });
  await writeFile(
    stalePath,
    JSON.stringify({
      version: 1,
      buildId: staleId,
      result: { cards: [], mediaByRoute: {}, routes: [{ pathname: '/stale/', kind: 'blog' }] },
    }),
  );
  await writeFile(configPath, fixtureConfig, 'utf8');
  await writeFile(routePath, fixtureRoute, 'utf8');
  assert.equal(await runStaticBuild(), 6);
  const routeHtml = path.join(outputDir, 'public-image-fixture', 'index.html');
  const htmlFirst = await readFile(routeHtml, 'utf8');
  assert.match(htmlFirst, /data-image-path="\/og-images\/blog\/fixture-post-cover\.jpg"/);
  assert.match(htmlFirst, /src="\/media\/blog-fixture-post-[a-f0-9]+-\d+\.jpg"/);
  assert.match(htmlFirst, /srcset="[^"]+\.webp \d+w/);
  const cardPath = path.join(outputDir, 'og-images', 'blog', 'fixture-post-cover.jpg');
  const cardFirst = await readFile(cardPath);
  await assertPublicOutputContainsNoBuildSecrets(outputDir);
  const mediaSrc = htmlFirst.match(/src="(\/media\/[^\"]+\.jpg)"/)?.[1];
  assert.ok(mediaSrc);
  assert.ok(await stat(path.join(outputDir, mediaSrc.slice(1))));
  blogTitle = 'Fixture version two';
  imageColor = '#2b60d4';
  assert.equal(await runStaticBuild(), 6);
  const htmlSecond = await readFile(routeHtml, 'utf8');
  const cardSecond = await readFile(cardPath);
  assert.match(htmlSecond, /data-cached="false"/);
  assert.notDeepEqual(
    cardSecond,
    cardFirst,
    'changed published content and media refresh the card at its stable URL',
  );
  assert.equal(await runStaticBuild(), 6);
  const htmlThird = await readFile(routeHtml, 'utf8');
  const cardThird = await readFile(cardPath);
  assert.match(htmlThird, /data-cached="true"/);
  assert.deepEqual(
    cardThird,
    cardSecond,
    'unchanged public cards reuse deterministic cached output',
  );
  for (const route of ['sitemap.xml', 'sitemap-index.xml', 'sitemap-0.xml']) {
    assert.ok(await exists(path.join(outputDir, route)), `${route} is emitted`);
  }
  console.log(
    'Astro static integration passed: lazy multi-page processing without review fetches, compact route reuse across sitemap routes, responsive assets, changed-media regeneration, and cache reuse.',
  );
} finally {
  await new Promise((resolve) => mockApi.close(resolve));
  await rm(routePath, { force: true });
  await rm(configPath, { force: true });
  await rm(outputDir, { recursive: true, force: true });
  await rm(stagingDir, { recursive: true, force: true });
  await rm(cacheDir, { recursive: true, force: true });
  await rm(stalePath, { force: true });
}
