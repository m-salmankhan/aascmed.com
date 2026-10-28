import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { writeBuildSnapshotBridge } from '../src/server/content/build-snapshot-bridge.ts';

const astroRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(astroRoot, 'src', 'pages', 'public-image-fixture.astro');
const configPath = path.join(astroRoot, 'astro.config.public-images-fixture.mjs');
const outputDir = path.join(astroRoot, 'dist-public-images-fixture');
const stagingDir = path.join(astroRoot, '.astro', 'public-images-fixture');
const cacheDir = path.join(astroRoot, '.astro', 'public-image-cache-fixture');
const staleId = randomUUID();
const staleSnapshot = { blogs: [], clinics: [], conditions: [], providers: [], serviceUpdates: [], reviews: [] };
const stalePath = path.join(astroRoot, '.astro', 'public-image-snapshots', `${staleId}.json`);
const svg = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${color}"/></svg>`;
let imageColor = '#df4b31';
let blogTitle = 'Fixture version one';
const requests = [];

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function assertPublicOutputContainsNoBuildSecrets(directory) {
  for (const entry of await import('node:fs/promises').then(({ readdir }) => readdir(directory, { withFileTypes: true }))) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await assertPublicOutputContainsNoBuildSecrets(fullPath);
    else {
      const body = (await readFile(fullPath)).toString('utf8');
      assert.doesNotMatch(body, /fixture-server-secret-never-publish|ASTRO_BUILD_SNAPSHOT_(?:ID|PATH)|ASTRO_BUILD_IMAGE_MANIFEST_PATH/);
    }
  }
}

for (const target of [routePath, configPath, outputDir, stagingDir, cacheDir, stalePath]) {
  assert.equal(await exists(target), false, `Refusing to overwrite existing fixture path: ${target}`);
}

const mockApi = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/uploads/cover.svg') {
    response.writeHead(200, { 'content-type': 'image/svg+xml', 'content-length': Buffer.byteLength(svg(imageColor)) });
    response.end(svg(imageColor));
    return;
  }
  const kind = url.pathname.split('/').filter(Boolean).at(-1);
  if (!['blogs', 'clinics', 'conditions', 'providers', 'service-updates', 'reviews'].includes(kind)) {
    response.writeHead(404); response.end(); return;
  }
  requests.push({ kind, status: url.searchParams.get('status') });
  const data = kind === 'blogs' ? [{
    id: 1, documentId: 'fixture-blog', slug: 'fixture-post', title: blogTitle, heading: blogTitle,
    thumbnail: { url: '/uploads/cover.svg', alternativeText: 'Fixture cover' },
  }] : [];
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ data, meta: { pagination: { pageCount: 1, total: data.length } } }));
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
  loadPublishedSnapshot: async () => {
    const { createStrapiRequestScope, getPublishedBuildSnapshot } = await import('./src/server/content/loaders.ts');
    return getPublishedBuildSnapshot({ scope: createStrapiRequestScope() });
  },
  stagingDir: path.resolve('.astro/public-images-fixture'),
  cacheDir: path.resolve('.astro/public-image-cache-fixture'),
});
const integrations = base.integrations.filter((item) => item.name !== 'aasc-public-images');
export default { ...base, outDir: './dist-public-images-fixture', integrations: [...integrations, integration] };
`;

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
  const expectedKinds = ['blogs', 'clinics', 'conditions', 'providers', 'service-updates', 'reviews'];
  assert.deepEqual(new Set(buildRequests.map(({ kind }) => kind)), new Set(expectedKinds));
  assert.ok(buildRequests.every(({ status }) => status === 'published'), 'build reads only published CMS collections');
  for (const kind of expectedKinds) assert.equal(buildRequests.filter((request) => request.kind === kind).length, 1, `${kind} has one request across image and sitemap builds`);
  return buildRequests.length;
};

try {
  await writeBuildSnapshotBridge(staleId, staleSnapshot);
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
  assert.notDeepEqual(cardSecond, cardFirst, 'changed published content and media refresh the card at its stable URL');

  assert.equal(await runStaticBuild(), 6);
  const htmlThird = await readFile(routeHtml, 'utf8');
  const cardThird = await readFile(cardPath);
  assert.match(htmlThird, /data-cached="true"/);
  assert.deepEqual(cardThird, cardSecond, 'unchanged public cards reuse deterministic cached output');
  for (const route of ['sitemap.xml', 'sitemap-index.xml', 'sitemap-0.xml']) {
    assert.ok(await exists(path.join(outputDir, route)), `${route} is emitted`);
  }
  console.log('Astro static integration passed: one published collection read per build across sitemap routes, private per-build bridge isolation, responsive assets, changed-media regeneration, and cache reuse.');
} finally {
  await new Promise((resolve) => mockApi.close(resolve));
  await rm(routePath, { force: true });
  await rm(configPath, { force: true });
  await rm(outputDir, { recursive: true, force: true });
  await rm(stagingDir, { recursive: true, force: true });
  await rm(cacheDir, { recursive: true, force: true });
  await rm(stalePath, { force: true });
}
