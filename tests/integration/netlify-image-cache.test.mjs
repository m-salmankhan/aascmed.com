// Verifies Netlify disk-cache restore through a clean Astro image build.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from 'node:http';
import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import { bindOpts } from '@netlify/cache-utils';

const require = createRequire(import.meta.url);
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const imageCachePaths = [
  'node_modules/.astro/assets',
  '.astro/public-images',
  '.astro/public-image-cache',
];

test('Netlify image cache restores native Astro assets and published social cards', async () => {
  await mkdir(path.join(repositoryRoot, '.astro'), { recursive: true });
  const fixtureDirectory = path.join(
    repositoryRoot,
    '.astro',
    `netlify-image-cache-fixture-${process.pid}`,
  );
  const fixturePageDirectory = path.join(fixtureDirectory, 'pages');
  const fixturePage = path.join(fixturePageDirectory, 'index.astro');
  const configPath = path.join(
    repositoryRoot,
    `astro.config.netlify-image-cache-${process.pid}.mjs`,
  );
  const outputDirectory = path.join(repositoryRoot, 'dist-image-cache-fixture');
  const backupDirectory = await mkdtemp(
    path.join(repositoryRoot, '.astro', 'netlify-image-cache-backup-'),
  );
  const diskCacheDirectory = await mkdtemp(
    path.join(os.tmpdir(), 'aasc-netlify-image-cache-'),
  );
  const backups = [];
  let cachesIsolated = false;
  let ownsFixtureDirectory = false;
  let ownsConfig = false;
  let ownsOutputDirectory = false;
  const imageBytes = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#2867d3' },
  }).jpeg().toBuffer();
  const requests = [];
  const imageServer = createServer((request, response) => {
    requests.push(request.url);
    response.writeHead(200, {
      'content-type': 'image/jpeg',
      'content-length': imageBytes.length,
      'cache-control': 'public, max-age=86400',
    });
    response.end(imageBytes);
  });

  /** Move pre-existing generated caches aside so this test never discards workspace state. */
  async function isolateGeneratedCaches() {
    for (const [index, relativePath] of imageCachePaths.entries()) {
      const originalPath = path.join(repositoryRoot, relativePath);
      const savedPath = path.join(backupDirectory, String(index));
      try {
        await stat(originalPath);
      } catch (error) {
        if (error.code === 'ENOENT') continue;
        throw error;
      }
      try {
        await rename(originalPath, savedPath);
        backups.push({ originalPath, savedPath });
      } catch (error) {
        if (error.code !== 'EXDEV') throw error;
        await cp(originalPath, savedPath, { recursive: true, preserveTimestamps: true });
        backups.push({ originalPath, savedPath });
        await rm(originalPath, { recursive: true, force: true });
      }
    }
    cachesIsolated = true;
  }

  async function findSocialCard(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const candidate = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        const nested = await findSocialCard(candidate);
        if (nested) return nested;
      } else if (entry.name.includes('cache-fixture') && entry.name.endsWith('.jpg')) {
        return candidate;
      }
    }
    return null;
  }

  async function clearGeneratedCaches() {
    for (const relativePath of imageCachePaths) {
      await rm(path.join(repositoryRoot, relativePath), { recursive: true, force: true });
    }
  }

  async function restoreOriginalCaches() {
    if (cachesIsolated) {
      await clearGeneratedCaches();
    }
    for (const { originalPath, savedPath } of backups) {
      await rm(originalPath, { recursive: true, force: true });
      await mkdir(path.dirname(originalPath), { recursive: true });
      await rename(savedPath, originalPath);
    }
  }

  /** Run an Astro build while retaining output for cache-hit assertions. */
  async function build(title) {
    const child = spawn(
      process.execPath,
      [
        path.join(repositoryRoot, 'node_modules/astro/bin/astro.mjs'),
        'build',
        '--config',
        path.basename(configPath),
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          IMAGE_CACHE_FIXTURE_TITLE: title,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    const exitCode = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', resolve);
    });
    assert.equal(exitCode, 0, `Astro fixture build failed:\n${output.slice(-12000)}`);
    return output;
  }

  const imageOrigin = await new Promise((resolve, reject) => {
    imageServer.once('error', reject);
    imageServer.listen(0, '127.0.0.1', () => {
      const address = imageServer.address();
      assert.ok(address && typeof address === 'object');
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });

  try {
    for (const target of [fixtureDirectory, configPath, outputDirectory]) {
      await assert.rejects(stat(target), { code: 'ENOENT' }, `Refusing to overwrite ${target}`);
    }
    ownsFixtureDirectory = true;
    ownsConfig = true;
    ownsOutputDirectory = true;
    await isolateGeneratedCaches();
    await mkdir(fixturePageDirectory, { recursive: true });
    await writeFile(
      fixturePage,
      `---
import { Image } from 'astro:assets';
const imageUrl = ${JSON.stringify(`${imageOrigin}/image.jpg`)};
---
<html><body><h1>Cache fixture</h1><Image src={imageUrl} alt="Cache fixture" width={600} height={400} /></body></html>
`,
      'utf8',
    );
    await writeFile(
      configPath,
      `import { defineConfig } from 'astro/config';
import { publicImagesIntegration } from './src/integrations/public-images.ts';
const imageUrl = ${JSON.stringify(`${imageOrigin}/image.jpg`)};
const imageOrigin = new URL(imageUrl).origin;
const imageHost = new URL(imageUrl);
export default defineConfig({
  root: ${JSON.stringify(repositoryRoot)},
  site: 'https://www.aascmed.com',
  srcDir: ${JSON.stringify(fixtureDirectory)},
  outDir: ${JSON.stringify(outputDirectory)},
  publicDir: ${JSON.stringify(path.join(repositoryRoot, 'static'))},
  output: 'static',
  image: { remotePatterns: [{ protocol: 'http', hostname: imageHost.hostname, port: imageHost.port, pathname: '/**' }] },
  integrations: [publicImagesIntegration({
    allowedMediaOrigins: [imageOrigin],
    stagingDir: ${JSON.stringify(path.join(repositoryRoot, '.astro/public-images'))},
    cacheDir: ${JSON.stringify(path.join(repositoryRoot, '.astro/public-image-cache'))},
    loadPublishedCollections: async () => ({
      blogs: [{ slug: 'cache-fixture', title: process.env.IMAGE_CACHE_FIXTURE_TITLE, thumbnail: { src: imageUrl } }],
      conditions: [],
      clinics: [],
    }),
  })],
});
`,
      'utf8',
    );

    const plugin = require(path.join(repositoryRoot, 'netlify/plugins/image-cache/index.js'));
    const cache = bindOpts({ cwd: repositoryRoot, cacheDir: diskCacheDirectory });

    await plugin.onPreBuild({ utils: { cache } });
    const coldOutput = await build('First published title');
    assert.match(coldOutput, /Prepared 1 published social cards/);
    assert.ok(requests.length > 0, 'cold build fetches the source image');
    await plugin.onPostBuild({ utils: { cache } });

    const socialCardPath = await findSocialCard(
      path.join(repositoryRoot, '.astro/public-images'),
    );
    assert.ok(socialCardPath, 'cold build produced the published fixture social card');
    const firstCard = await readFile(socialCardPath);
    const firstRequestCount = requests.length;

    await clearGeneratedCaches();
    await rm(outputDirectory, { recursive: true, force: true });
    for (const relativePath of imageCachePaths) {
      const restored = await cache.has(relativePath);
      assert.equal(restored, true, `${relativePath} was saved in the real Netlify disk cache`);
    }

    await plugin.onPreBuild({ utils: { cache } });
    const restoredCardStat = await stat(socialCardPath);
    const warmOutput = await build('First published title');
    assert.match(warmOutput, /reused cache entry/i, 'Astro reuses its restored native image transform');
    assert.equal(
      requests.length,
      firstRequestCount + 1,
      'only social-card input checking fetches the source again; Astro reuses its native transform',
    );
    assert.deepEqual(await readFile(socialCardPath), firstCard, 'social-card bytes survive cache restore');
    assert.equal(
      (await stat(socialCardPath)).mtimeMs,
      restoredCardStat.mtimeMs,
      'warm build does not regenerate a restored social card',
    );
    await plugin.onPostBuild({ utils: { cache } });

    await plugin.onPreBuild({ utils: { cache } });
    const changedOutput = await build('Updated published title');
    assert.match(changedOutput, /reused cache entry/i, 'content change still reuses native image transforms');
    const changedCard = await readFile(socialCardPath);
    assert.notDeepEqual(changedCard, firstCard, 'changed published title regenerates its social card');
    await plugin.onPostBuild({ utils: { cache } });

    await plugin.onPreBuild({ utils: { cache } });
    const repeatedOutput = await build('Updated published title');
    assert.match(repeatedOutput, /reused cache entry/i, 'unchanged warm build reuses native image transforms');
    assert.deepEqual(
      await readFile(socialCardPath),
      changedCard,
      'unchanged warm build keeps deterministic social-card bytes',
    );
  } finally {
    if (imageServer.listening) {
      await new Promise((resolve) => imageServer.close(resolve));
    }
    if (ownsFixtureDirectory) {
      await rm(fixtureDirectory, { recursive: true, force: true });
    }
    if (ownsConfig) {
      await rm(configPath, { force: true });
    }
    if (ownsOutputDirectory) {
      await rm(outputDirectory, { recursive: true, force: true });
    }
    await restoreOriginalCaches();
    await rm(backupDirectory, { recursive: true, force: true });
    await rm(diskCacheDirectory, { recursive: true, force: true });
  }
});
