import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { publicImagesIntegration } from '../src/integrations/public-images.ts';

const astroRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(astroRoot, 'src', 'pages', 'public-image-fixture.astro');
const outputImagePath = path.join(astroRoot, 'dist-static', 'og-images', 'blog', 'fixture-post-hero-bg.jpg');
const outputRoutePath = path.join(astroRoot, 'dist-static', 'public-image-fixture', 'index.html');
const stagingDir = path.join(astroRoot, '.astro', 'public-images');
const cacheDir = path.join(astroRoot, '.astro', 'public-image-cache');
const manifestPath = path.join(astroRoot, '.astro', 'public-image-manifest.json');
const publishedSnapshotPath = path.join(astroRoot, '.astro', 'published-content-snapshot.json');

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

for (const target of [routePath, outputImagePath, outputRoutePath, stagingDir, cacheDir, manifestPath, publishedSnapshotPath]) {
  assert.equal(await exists(target), false, `Refusing to overwrite existing fixture path: ${target}`);
}

let previewReads = 0;
const previewGuard = publicImagesIntegration({
  loadPublishedCollections: async () => { previewReads++; throw new Error('SSR must not load a bulk published snapshot'); },
});
await previewGuard.hooks['astro:config:setup']({ config: { output: 'server' }, command: 'build' });
await previewGuard.hooks['astro:build:start']({ logger: { info() {} } });
assert.equal(previewReads, 0, 'server/preview builds never load the published image snapshot');

const backgroundPath = path.resolve(astroRoot, '..', 'static', 'assets', 'hero-bg.png');
const fixtureRoute = `
---
import { getSocialCardImagePath } from '../lib/public-images';
import { getPublishedImageManifest } from '../server/content/public-images';
const image = getSocialCardImagePath({ kind: 'blog', slug: 'fixture-post', title: 'Fixture Post', mediaName: 'hero-bg' });
const manifest = await getPublishedImageManifest();
const media = manifest?.mediaByRoute['blog:fixture-post'];
---
<html><head><meta property="og:image" content={image} /></head><body><img id="responsive" src={media?.src} srcset={media?.formats?.[1]?.srcSet} /></body></html>
`;

const requests = [];
const generatedMediaPaths = [];
const mockApi = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  const kind = url.pathname.split('/').filter(Boolean).at(-1);
  requests.push({ kind, status: url.searchParams.get('status') });
  const data = kind === 'blogs' ? [{
    id: 1,
    documentId: 'fixture-blog-document',
    slug: 'fixture-post',
    title: 'Fixture Post',
    heading: 'Fixture Post',
    thumbnail: { url: backgroundPath, alternativeText: 'Fixture cover' },
  }] : [];
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ data, meta: { pagination: { pageCount: 1, total: data.length } } }));
});

await new Promise((resolve) => mockApi.listen(0, '127.0.0.1', resolve));
const address = mockApi.address();
assert.ok(address && typeof address === 'object');

try {
  await writeFile(routePath, fixtureRoute, 'utf8');
  const cli = path.join(astroRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const build = spawn(process.execPath, [cli, 'build', '--config', 'astro.config.static.mjs'], {
    cwd: astroRoot,
    stdio: 'inherit',
    env: { ...process.env, ASTRO_STRAPI_API_URL: `http://127.0.0.1:${address.port}/api` },
  });
  const buildStatus = await new Promise((resolve, reject) => {
    build.once('error', reject);
    build.once('close', (code) => resolve(code));
  });
  assert.equal(buildStatus, 0, 'Astro static fixture build succeeds');

  const html = await readFile(outputRoutePath, 'utf8');
  assert.match(html, /content="\/og-images\/blog\/fixture-post-hero-bg\.jpg"/);
  assert.match(html, /src="\/media\/blog-fixture-post-[a-f0-9]+-\d+\.jpg"/);
  assert.match(html, /srcset="[^"]+\.webp \d+w/);
  assert.deepEqual(await sharp(outputImagePath).metadata().then(({ width, height }) => [width, height]), [1200, 630]);
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const snapshot = JSON.parse(await readFile(publishedSnapshotPath, 'utf8'));
  assert.deepEqual(snapshot.blogs.map(({ slug }) => slug), ['fixture-post']);
  const media = manifest.mediaByRoute['blog:fixture-post'];
  assert.ok(media, 'fixture route receives its generated public descriptor');
  const mediaUrls = [media.src, ...(media.sources || []).map(({ src }) => src), ...(media.formats || []).flatMap(({ srcSet }) => srcSet.split(',').map((item) => item.trim().split(/\s+/)[0]))];
  generatedMediaPaths.push(...mediaUrls.map((mediaUrl) => path.join(astroRoot, 'dist-static', mediaUrl.replace(/^\/+/, ''))));
  for (const mediaUrl of mediaUrls) assert.equal(await exists(path.join(astroRoot, 'dist-static', mediaUrl.replace(/^\/+/, ''))), true, `responsive image exists for ${mediaUrl}`);
  assert.deepEqual(new Set(requests.map(({ kind }) => kind)), new Set(['blogs', 'clinics', 'conditions', 'providers', 'service-updates', 'reviews']));
  assert.ok(requests.every(({ status }) => status === 'published'), 'the build snapshot requests only published content');
  for (const kind of new Set(requests.map(({ kind }) => kind))) {
    assert.equal(requests.filter((request) => request.kind === kind).length, 1, `${kind} uses one collection fetch across image and route builds`);
  }
  console.log('Astro static image integration passed: published snapshot reuse, page metadata URL, copied 1200×630 card, and SSR guard.');
} finally {
  await new Promise((resolve) => mockApi.close(resolve));
  await rm(routePath, { force: true });
  await rm(outputImagePath, { force: true });
  await rm(outputRoutePath, { force: true });
  await Promise.all(generatedMediaPaths.map((target) => rm(target, { force: true })));
  await rm(stagingDir, { recursive: true, force: true });
  await rm(cacheDir, { recursive: true, force: true });
  await rm(manifestPath, { force: true });
  await rm(publishedSnapshotPath, { force: true });
}
