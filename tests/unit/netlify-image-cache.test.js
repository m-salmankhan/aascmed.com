const test = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, writeFile, readFile, access, rm } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const plugin = require('../../netlify/plugins/image-cache');

test('a partial restore is discarded without removing dependencies or blocking other image caches', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'aasc-cache-failure-'));
  const originalCwd = process.cwd();
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  try {
    process.chdir(root);
    await mkdir('node_modules/.astro/assets', { recursive: true });
    await writeFile('node_modules/keep.js', 'installed dependency');
    await plugin.onPreBuild({ utils: { cache: {
      async restore(directory) {
        await mkdir(directory, { recursive: true });
        if (directory === 'node_modules/.astro/assets') {
          await writeFile(path.join(directory, 'partial.json'), 'incomplete');
          throw new Error('interrupted restore');
        }
        await writeFile(path.join(directory, 'restored'), 'cached card data');
        return true;
      },
    } } });
    await assert.rejects(access('node_modules/.astro/assets'), { code: 'ENOENT' });
    assert.equal(await readFile('node_modules/keep.js', 'utf8'), 'installed dependency');
    assert.equal(await readFile('.astro/public-image-cache/restored', 'utf8'), 'cached card data');
  } finally {
    process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
});

test('an unavailable cache store does not prevent a built site from being deployed', async (t) => {
  const warnings = [];
  const saved = [];
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', (message) => warnings.push(message));
  await plugin.onPostBuild({ utils: { cache: {
    async save(directory) {
      if (directory === 'node_modules/.astro/assets') throw new Error('cache store unavailable');
      saved.push(directory);
      return true;
    },
  } } });
  assert.equal(warnings.length, 1);
  assert.ok(saved.includes('.astro/public-images'), 'card JPEGs are still saved');
  assert.ok(saved.includes('.astro/public-image-cache'), 'card fingerprints are still saved');
});
