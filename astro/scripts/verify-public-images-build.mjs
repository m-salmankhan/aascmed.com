import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { publicImagesIntegration } from '../src/integrations/public-images.ts';

const astroRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routePath = path.join(astroRoot, 'src', 'pages', 'public-image-fixture.astro');
const configPath = path.join(astroRoot, 'astro.config.public-images-fixture.mjs');
const outputImagePath = path.join(astroRoot, 'dist-static', 'og-images', 'blog', 'fixture-post-hero-bg.jpg');
const outputRoutePath = path.join(astroRoot, 'dist-static', 'public-image-fixture', 'index.html');
const stagingDir = path.join(astroRoot, '.astro', 'public-images-fixture');
const cacheDir = path.join(astroRoot, '.astro', 'public-image-cache-fixture');
const manifestPath = path.join(astroRoot, '.astro', 'public-image-manifest-fixture.json');
const publishedSnapshotPath = path.join(astroRoot, '.astro', 'published-content-snapshot-fixture.json');

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

for (const target of [routePath, configPath, outputImagePath, outputRoutePath, stagingDir, cacheDir, manifestPath, publishedSnapshotPath]) {
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

const fixtureConfig = `
import base from './astro.config.static.mjs';
import { publicImagesIntegration } from './src/integrations/public-images.ts';
import path from 'node:path';
const integration = publicImagesIntegration({
  loadPublishedCollections: async () => {
    const { getPublishedBuildSnapshot } = await import('./src/server/content/loaders.ts');
    return getPublishedBuildSnapshot({ staticBuild: true });
  },
  stagingDir: path.resolve('.astro/public-images-fixture'),
  cacheDir: path.resolve('.astro/public-image-cache-fixture'),
  manifestPath: path.resolve('.astro/public-image-manifest-fixture.json'),
});
const integrations = base.integrations.filter((item) => item.name !== 'aasc-public-images');
export default { ...base, integrations: [...integrations, integration] };
`;

const requests = [];
const generatedMediaPaths = [];
const singleTypes = {
  announcement: { documentId: 'announcement', enabled: false, type: 'info', message: [] },
  'tracking-info': { documentId: 'tracking-info', googleAnalyticsId: '', googleTagManagerId: '', pixelId: '' },
  'blog-archive': { documentId: 'blog-archive', heading: 'Blog', metaDescription: 'Blog fixture', text: [] },
  'conditions-archive': { documentId: 'conditions-archive', heading: 'Conditions', metaDescription: 'Condition fixture', text: [] },
  'providers-page': { documentId: 'providers-page', heading: 'Meet the team', metaDescription: 'Provider fixture', text: [] },
  'privacy-policy': { documentId: 'privacy-policy', heading: 'Privacy Policy', title: 'Privacy Policy', metaDescription: 'Privacy fixture', text: [] },
  contact: { documentId: 'contact', heading: 'Contact Us', title: 'Contact Us', metaDescription: 'Contact fixture', text: [] },
};
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
  }] : kind in singleTypes ? singleTypes[kind] : [];
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(Array.isArray(data)
    ? { data, meta: { pagination: { pageCount: 1, total: data.length } } }
    : { data }));
});

await new Promise((resolve) => mockApi.listen(0, '127.0.0.1', resolve));
const address = mockApi.address();
assert.ok(address && typeof address === 'object');

try {
  await writeFile(configPath, fixtureConfig, 'utf8');
  await writeFile(routePath, fixtureRoute, 'utf8');
  const cli = path.join(astroRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const runStaticBuild = async () => {
    const build = spawn(process.execPath, [cli, 'build', '--config', path.basename(configPath)], {
      cwd: astroRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        ASTRO_STRAPI_API_URL: `http://127.0.0.1:${address.port}/api`,
        ASTRO_PUBLISHED_CONTENT_SNAPSHOT_PATH: publishedSnapshotPath,
        ASTRO_PUBLIC_IMAGE_MANIFEST_PATH: manifestPath,
      },
    });
    return new Promise((resolve, reject) => {
      build.once('error', reject);
      build.once('close', resolve);
    });
  };
  assert.equal(await runStaticBuild(), 0, 'Astro static fixture build succeeds');

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
  const collectionKinds = new Set(['blogs', 'clinics', 'conditions', 'providers', 'service-updates', 'reviews']);
  const collectionRequests = () => requests.filter(({ kind }) => collectionKinds.has(kind));
  assert.deepEqual(new Set(collectionRequests().map(({ kind }) => kind)), collectionKinds);
  assert.ok(requests.every(({ status }) => status === 'published'), 'the build snapshot requests only published content');
  for (const kind of collectionKinds) {
    assert.equal(collectionRequests().filter((request) => request.kind === kind).length, 1, `${kind} uses one collection fetch across image and route builds`);
  }
  const stagedCardPath = path.join(stagingDir, 'og-images', 'blog', 'fixture-post-hero-bg.jpg');
  const stagedMediaPath = path.join(stagingDir, media.src.replace(/^\/+/, ''));
  const cardBefore = await stat(stagedCardPath);
  const mediaBefore = await stat(stagedMediaPath);
  assert.equal(await runStaticBuild(), 0, 'second Astro static fixture build succeeds');
  assert.equal(collectionRequests().length, 12, 'each build refreshes its snapshot once and prerender reuses it');
  assert.equal((await stat(stagedCardPath)).mtimeMs, cardBefore.mtimeMs, 'unchanged social cards are reused from the private staging directory');
  assert.equal((await stat(stagedMediaPath)).mtimeMs, mediaBefore.mtimeMs, 'unchanged responsive media files are reused');
  console.log('Astro static image integration passed: one published snapshot per build, metadata URL, responsive output, persistent cache reuse, and SSR guard.');
} finally {
  await new Promise((resolve) => mockApi.close(resolve));
  await rm(routePath, { force: true });
  await rm(configPath, { force: true });
  await rm(outputImagePath, { force: true });
  await rm(outputRoutePath, { force: true });
  await Promise.all(generatedMediaPaths.map((target) => rm(target, { force: true })));
  await rm(stagingDir, { recursive: true, force: true });
  await rm(cacheDir, { recursive: true, force: true });
  await rm(manifestPath, { force: true });
  await rm(publishedSnapshotPath, { force: true });
}
