import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { bindOpts } from '@netlify/cache-utils';
import { buildSocialCards } from '../../src/server/media/social-cards.ts';

const require = createRequire(import.meta.url);
const plugin = require('../../netlify/plugins/image-cache');

test('a failed JPEG cache save cannot publish stale cards with new fingerprints', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aasc-partial-card-cache-'));
  const originalCwd = process.cwd();
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  try {
    process.chdir(root);
    const cache = bindOpts({ cwd: root, cacheDir: path.join(root, 'netlify-cache') });
    const options = {
      publicDir: path.join(root, '.astro/public-images'),
      cacheDir: path.join(root, '.astro/public-image-cache'),
    };
    const entries = [
      { kind: 'blog', slug: 'changed', title: 'Old published title' },
      { kind: 'blog', slug: 'unchanged', title: 'Unchanged title' },
    ];
    const first = await buildSocialCards(entries, options);
    const oldBytes = await readFile(first[0].outputPath);
    await plugin.onPostBuild({ utils: { cache } });

    entries[0].title = 'New published title';
    const changed = await buildSocialCards(entries, options);
    const expectedBytes = await readFile(changed[0].outputPath);
    assert.notDeepEqual(expectedBytes, oldBytes);
    assert.equal(changed[1].wasCached, true);
    await plugin.onPostBuild({ utils: { cache: {
      ...cache,
      async save(directory) {
        if (directory === '.astro/public-images') throw new Error('JPEG cache upload interrupted');
        return cache.save(directory);
      },
    } } });

    await rm(options.publicDir, { recursive: true });
    await rm(options.cacheDir, { recursive: true });
    await plugin.onPreBuild({ utils: { cache } });
    assert.deepEqual(await readFile(changed[0].outputPath), oldBytes, 'restore reproduces the old JPEG/new metadata pair');
    const repaired = await buildSocialCards(entries, options);
    assert.equal(repaired[0].wasCached, false, 'mismatched JPEG is regenerated despite matching input fingerprint');
    assert.deepEqual(await readFile(repaired[0].outputPath), expectedBytes, 'the current title is rendered');
    assert.equal(repaired[1].wasCached, true, 'an unrelated valid card remains reusable');
    const warm = await buildSocialCards(entries, options);
    assert.equal(warm[0].wasCached, true, 'the repaired checksum is reusable on the next build');

    const metadataPath = path.join(options.cacheDir, 'social-cards.json');
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    await writeFile(metadataPath, JSON.stringify(Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [key, value.split(':')[0]]),
    )));
    const migrated = await buildSocialCards(entries, options);
    assert.ok(migrated.every(({ wasCached }) => !wasCached), 'legacy input-only fingerprints cause a safe cache miss');
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
});
