// Fixtures for lazy social-card generation and static card copying.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicImagesIntegration } from '../../astro/src/integrations/public-images.ts';
import { buildPublishedSocialCards } from '../../astro/src/server/content/public-images.ts';

test('social-card generation streams records and preserves nested paths', async () => {
  const originalCwd = process.cwd();
  const root = await import('node:fs/promises').then(({ mkdtemp }) =>
    mkdtemp(path.join(os.tmpdir(), 'aasc-public-build-')),
  );
  const sourcePath = path.join(root, 'cover.svg');
  const publicDir = path.join(root, 'public');
  const cacheDir = path.join(root, 'cache');
  /** Create a deterministic image that does not need CMS credentials.
   * @param {string} color SVG fill color used by the generated card.
   * @returns {string} SVG document bytes.
   */
  const svg = (color) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${color}"/></svg>`;
  /** Reject a second iterator request to verify the renderer consumes each stream once.
   * @param {AsyncIterable<unknown>} records Lazy records supplied to the card renderer.
   * @returns {AsyncIterable<unknown>} The same iterable with one-shot enforcement.
   */
  function oneShot(records) {
    let started = false;
    return {
      [Symbol.asyncIterator]() {
        assert.equal(started, false, 'each card stream is consumed once');
        started = true;
        return records[Symbol.asyncIterator]();
      },
    };
  }
  /** Yield test records without eagerly collecting them.
   * @param {unknown[]} records Small normalized records used by this fixture.
   * @yields One record at a time.
   */
  async function* records(records) {
    yield* records;
  }

  try {
    await process.chdir(root);
    await writeFile(sourcePath, svg('#df4b31'));
    const builtCards = await buildPublishedSocialCards(
      {
        blogs: [
          {
            id: 'blog-one',
            slug: 'news/spring',
            title: 'Spring news',
            thumbnail: { src: sourcePath, alt: 'News thumbnail' },
          },
          {
            id: 'blog-two',
            slug: 'guides/spring',
            title: 'Spring guide',
            thumbnail: { src: sourcePath, alt: 'Guide thumbnail' },
          },
        ],
        conditions: [],
        clinics: [
          {
            id: 'clinic-one',
            slug: 'district/aurora',
            clinicName: 'Aurora',
            location: { latitude: 42.3, longitude: -71.1 },
          },
        ],
      },
      { publicDir, cacheDir },
    );
    assert.deepEqual(builtCards.map(({ imagePath }) => imagePath).sort(), [
      '/og-images/blog/guides/spring-cover.jpg',
      '/og-images/blog/news/spring-cover.jpg',
      '/og-images/clinics/district/aurora-aurora-42.3--71.1-map.jpg',
    ]);
    for (const card of builtCards) assert.ok(await stat(card.outputPath));

    const stagingDir = path.join(root, '.astro', 'staging');
    /** Ensure the preceding card is written before requesting the next CMS record.
     * @yields Three normalized blog records while checking card-render backpressure.
     */
    async function* lazyBlogs() {
      for (let index = 0; index < 3; index++) {
        if (index > 0) {
          assert.ok(
            await stat(
              path.join(
                stagingDir,
                'og-images/blog',
                `lazy-${index - 1}-default.jpg`,
              ),
            ),
          );
        }
        yield {
          id: `lazy-${index}`,
          slug: `lazy-${index}`,
          title: `Lazy ${index}`,
        };
      }
    }
    /** Fail if card generation requests unrelated collections.
     * @yields Nothing; providers, updates and reviews do not have social cards here.
     */
    async function* unusedCollection() {
      throw new Error(
        'The social-card hook must not request unrelated collections',
      );
    }
    let collectionLoads = 0;
    let currentTitle = 'Fixture version one';
    const integration = publicImagesIntegration({
      loadPublishedCollections: async () => {
        collectionLoads++;
        return {
          blogs: oneShot(
            records([
              {
                id: 'fixture-blog',
                slug: 'fixture-post',
                title: currentTitle,
                thumbnail: { src: sourcePath, alt: 'Fixture cover' },
              },
            ]),
          ),
          conditions: oneShot(records([])),
          clinics: oneShot(records([])),
          providers: oneShot(unusedCollection()),
          serviceUpdates: oneShot(unusedCollection()),
          reviews: oneShot(unusedCollection()),
        };
      },
      stagingDir,
      cacheDir,
    });
    await integration.hooks['astro:config:setup']({
      config: { output: 'server' },
      command: 'build',
    });
    await integration.hooks['astro:build:start']({ logger: { info() {} } });
    assert.equal(collectionLoads, 0, 'SSR builds skip social-card generation');
    await integration.hooks['astro:config:setup']({
      config: { output: 'static' },
      command: 'dev',
    });
    await integration.hooks['astro:build:start']({ logger: { info() {} } });
    assert.equal(
      collectionLoads,
      0,
      'dev does not reuse or create static-build cards',
    );
    await integration.hooks['astro:config:setup']({
      config: { output: 'static' },
      command: 'build',
    });
    const runBuildHook = async () => {
      await integration.hooks['astro:build:start']({ logger: { info() {} } });
      await integration.hooks['astro:build:done']({
        dir: pathToFileURL(`${path.join(root, 'output')}${path.sep}`),
      });
      return path.join(root, 'output/og-images/blog/fixture-post-cover.jpg');
    };
    const firstCardPath = await runBuildHook();
    const firstBytes = await readFile(firstCardPath);
    currentTitle = 'Fixture version two';
    await writeFile(sourcePath, svg('#2b60d4'));
    const secondCardPath = await runBuildHook();
    const secondBytes = await readFile(secondCardPath);
    assert.notDeepEqual(
      secondBytes,
      firstBytes,
      'changed source content refreshes stable card paths',
    );
    const stagedCard = path.join(
      stagingDir,
      'og-images/blog/fixture-post-cover.jpg',
    );
    const stagedTime = (await stat(stagedCard)).mtimeMs;
    await runBuildHook();
    assert.equal(collectionLoads, 3);
    assert.equal(
      (await stat(stagedCard)).mtimeMs,
      stagedTime,
      'unchanged cards reuse their cached bytes',
    );

    const lazyIntegration = publicImagesIntegration({
      loadPublishedCollections: async () => ({
        blogs: oneShot(lazyBlogs()),
        conditions: oneShot(records([])),
        clinics: oneShot(records([])),
        providers: oneShot(unusedCollection()),
        serviceUpdates: oneShot(unusedCollection()),
        reviews: oneShot(unusedCollection()),
      }),
      stagingDir,
      cacheDir: path.join(root, 'lazy-cache'),
    });
    await lazyIntegration.hooks['astro:config:setup']({
      config: { output: 'static' },
      command: 'build',
    });
    await lazyIntegration.hooks['astro:build:start']({ logger: { info() {} } });
    assert.ok(
      await stat(path.join(stagingDir, 'og-images/blog/lazy-2-default.jpg')),
    );
    await lazyIntegration.hooks['astro:build:done']({
      dir: pathToFileURL(`${path.join(root, 'output')}${path.sep}`),
    });
  } finally {
    await process.chdir(originalCwd);
    await rm(root, { recursive: true, force: true });
  }
});
