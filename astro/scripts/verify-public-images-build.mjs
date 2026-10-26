import assert from 'node:assert/strict';
import { access, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
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

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

for (const target of [routePath, configPath, outputImagePath, outputRoutePath, stagingDir, cacheDir]) {
  assert.equal(await exists(target), false, `Refusing to overwrite existing fixture path: ${target}`);
}

let cmsReads = 0;
const previewGuard = publicImagesIntegration({
  loadPublishedCollections: async () => { cmsReads++; throw new Error('Preview must not load published collections'); },
});
await previewGuard.hooks['astro:config:setup']({ config: { output: 'server' }, command: 'build' });
await previewGuard.hooks['astro:build:start']({ logger: { info() {} } });
assert.equal(cmsReads, 0, 'server/preview builds never load the published image snapshot');

const fixtureSource = `
import base from './astro.config.static.mjs';
import { publicImagesIntegration } from './src/integrations/public-images.ts';
import path from 'node:path';
const background = path.resolve('../static/assets/hero-bg.png');
const fixture = { blogs: [{ id: 'fixture', documentId: 'fixture', slug: 'fixture-post', title: 'Fixture Post', heading: 'Fixture Post', thumbnail: { src: background, alt: 'Fixture' } }], clinics: [], conditions: [] };
const images = publicImagesIntegration({ loadPublishedCollections: async () => fixture, stagingDir: path.resolve('.astro/public-images-fixture'), cacheDir: path.resolve('.astro/public-image-cache-fixture') });
export default { ...base, integrations: [...base.integrations, images] };
`;
const routeSource = `
---
import { getSocialCardImagePath } from '../lib/public-images';
const image = getSocialCardImagePath({ kind: 'blog', slug: 'fixture-post', title: 'Fixture Post', mediaName: 'hero-bg' });
---
<html><head><meta property="og:image" content={image} /></head><body>Fixture route</body></html>
`;

try {
  await writeFile(configPath, fixtureSource, 'utf8');
  await writeFile(routePath, routeSource, 'utf8');
  const cli = path.join(astroRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const build = spawnSync(process.execPath, [cli, 'build', '--config', path.basename(configPath)], {
    cwd: astroRoot,
    stdio: 'inherit',
    env: process.env,
  });
  assert.equal(build.status, 0, 'Astro static fixture build succeeds');

  const html = await readFile(outputRoutePath, 'utf8');
  assert.match(html, /content="\/og-images\/blog\/fixture-post-hero-bg\.jpg"/);
  assert.deepEqual(await sharp(outputImagePath).metadata().then(({ width, height }) => [width, height]), [1200, 630]);
  console.log('Astro static image integration passed: published fixture snapshot, page metadata URL, copied 1200×630 card, and no SSR snapshot load.');
} finally {
  await rm(routePath, { force: true });
  await rm(configPath, { force: true });
  await rm(outputImagePath, { force: true });
  await rm(outputRoutePath, { force: true });
  await rm(stagingDir, { recursive: true, force: true });
  await rm(cacheDir, { recursive: true, force: true });
}
