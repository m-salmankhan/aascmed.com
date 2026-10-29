// Fixtures for static image hooks, private compact indexes, and nested-route mapping.
import assert from 'node:assert/strict';
import { access, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { publicImagesIntegration } from '../src/integrations/public-images.ts';
import { buildPublishedSocialCards } from '../src/server/content/public-images.ts';
/** @typedef {import('../src/server/content/loaders.ts').PublishedCollections} PublishedCollections */
const originalCwd = process.cwd();
const root = await import('node:fs/promises').then(({ mkdtemp }) =>
  mkdtemp(path.join(os.tmpdir(), 'aasc-public-build-')),
);
const sourcePath = path.join(root, 'cover.svg');
const outputDir = path.join(root, 'output');
const cacheDir = path.join(root, '.astro', 'image-cache');
/** Build the small local image used to exercise card rendering without CMS credentials.
 * @param {string} color Fill color for the fixture image.
 * @returns {string} SVG bytes as text.
 */
const svg = (color) => {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${color}"/></svg>`;
};
/** Create one published-collections fixture containing a blog with a local thumbnail.
 * @param {string} title Blog title used to trigger content-aware regeneration between builds.
 * @returns {PublishedCollections} Small fixture values consumed as iterable collections by the static image integration.
 */
const collectionsFor = (title) => {
  return {
    blogs: [
      {
        id: 'fixture-blog',
        documentId: 'fixture-blog',
        slug: 'fixture-post',
        title,
        heading: title,
        thumbnail: { src: sourcePath, alt: 'Fixture cover' },
      },
    ],
    clinics: [],
    conditions: [],
    providers: [],
    serviceUpdates: [],
    reviews: [],
  };
};
try {
  await process.chdir(root);
  await writeFile(sourcePath, svg('#df4b31'));
  const nestedPublicDir = path.join(root, 'nested-public');
  const nestedBuild = await buildPublishedSocialCards(
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
      clinics: [
        {
          id: 'clinic-one',
          slug: 'district/aurora',
          clinicName: 'Aurora',
          location: { latitude: 42.3, longitude: -71.1 },
        },
      ],
      conditions: [],
      providers: [],
      serviceUpdates: [],
    },
    { publicDir: nestedPublicDir, cacheDir: path.join(root, 'nested-cache') },
  );
  assert.deepEqual(Object.keys(nestedBuild.mediaByRoute).sort(), [
    'blog:guides/spring',
    'blog:news/spring',
  ]);
  assert.deepEqual(nestedBuild.cards.map(({ imagePath }) => imagePath).sort(), [
    '/og-images/blog/guides/spring-cover.jpg',
    '/og-images/blog/news/spring-cover.jpg',
    '/og-images/clinics/district/aurora-aurora-42.3--71.1-map.jpg',
  ]);
  assert.equal(
    nestedBuild.cards.find(({ kind }) => kind === 'clinics')?.imagePath,
    '/og-images/clinics/district/aurora-aurora-42.3--71.1-map.jpg',
    'nested clinic filenames keep Gatsby legacy basename parity',
  );
  assert.equal(
    new Set(nestedBuild.cards.map(({ outputPath }) => outputPath)).size,
    nestedBuild.cards.length,
    'nested route families write distinct image files',
  );
  for (const card of nestedBuild.cards) {
    assert.ok(await stat(card.outputPath));
  }
  for (const media of Object.values(nestedBuild.mediaByRoute)) {
    assert.ok(await stat(path.join(nestedPublicDir, 'media', path.basename(media.src))));
  }
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID;
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
  let collectionLoads = 0;
  let currentTitle = 'Fixture version one';
  const integration = publicImagesIntegration({
    loadPublishedCollections: async () => {
      collectionLoads++;
      return collectionsFor(currentTitle);
    },
    stagingDir: path.join(root, '.astro', 'staging'),
    cacheDir,
  });
  await integration.hooks['astro:config:setup']({
    config: { output: 'server' },
    command: 'build',
  });
  await integration.hooks['astro:build:start']({ logger: { info() {} } });
  assert.equal(collectionLoads, 0, 'SSR builds skip public image generation and collection loads');
  await integration.hooks['astro:config:setup']({
    config: { output: 'static' },
    command: 'dev',
  });
  await integration.hooks['astro:build:start']({ logger: { info() {} } });
  assert.equal(collectionLoads, 0, 'dev does not reuse or generate a static build collections');
  await integration.hooks['astro:config:setup']({
    config: { output: 'static' },
    command: 'build',
  });
  /** Execute one static integration lifecycle and return the copied card path plus its build ID.
   * @returns Promise of the emitted card path and the per-build private index ID.
   */
  const runBuildHook = async () => {
    await integration.hooks['astro:build:start']({ logger: { info() {} } });
    const buildId = process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID;
    const manifestPath = process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
    assert.ok(buildId && manifestPath, 'static hook sets its private compact-index identity');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')).result;
    const image = manifest.cards.find(({ slug }) => slug === 'fixture-post');
    assert.equal(image.imagePath, '/og-images/blog/fixture-post-cover.jpg');
    assert.equal(
      image.wasCached,
      collectionLoads === 3,
      'only unchanged later builds reuse the generated card',
    );
    assert.equal(manifest.mediaByRoute['blog:fixture-post'].width, 900);
    await integration.hooks['astro:build:done']({
      dir: pathToFileURL(`${outputDir}${path.sep}`),
    });
    await assert.rejects(access(manifestPath), { code: 'ENOENT' });
    assert.equal(process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID, undefined);
    return {
      imagePath: path.join(outputDir, image.imagePath.slice(1)),
      buildId,
    };
  };
  const first = await runBuildHook();
  const firstBytes = await readFile(first.imagePath);
  currentTitle = 'Fixture version two';
  await writeFile(sourcePath, svg('#2b60d4'));
  const second = await runBuildHook();
  const secondBytes = await readFile(second.imagePath);
  assert.notEqual(
    second.buildId,
    first.buildId,
    'each static build receives a fresh cache identity',
  );
  assert.notDeepEqual(
    secondBytes,
    firstBytes,
    'changed CMS title and media at the same source URL refresh public cards',
  );
  assert.equal(
    collectionLoads,
    2,
    'the integration loads exactly one normalized collection set per build',
  );
  const stagedCard = path.join(
    root,
    '.astro',
    'staging',
    'og-images',
    'blog',
    'fixture-post-cover.jpg',
  );
  const beforeReuse = await stat(stagedCard);
  await runBuildHook();
  assert.equal(collectionLoads, 3);
  assert.equal(
    (await stat(stagedCard)).mtimeMs,
    beforeReuse.mtimeMs,
    'unchanged card files are reused across static builds',
  );
  assert.ok(await stat(second.imagePath));
  /** Make fixture record streams fail if a consumer tries to iterate a collection twice.
   * @param {AsyncIterable<unknown>} records One-shot fixture source.
   * @returns {AsyncIterable<unknown>} The same source with a repeated-iteration guard.
   */
  function oneShot(records) {
    let started = false;
    return {
      /** Open the only permitted iterator for this fixture collection.
       * @returns {AsyncIterator<unknown>} The underlying record iterator.
       */
      [Symbol.asyncIterator]() {
        assert.equal(started, false, 'each published stream is consumed exactly once');
        started = true;
        return records[Symbol.asyncIterator]();
      },
    };
  }
  /** Yield a small set of fixture values as a lazy collection.
   * @param {unknown[]} records Explicit fixture values, never production CMS data.
   * @yields One fixture value per consumer request.
   */
  async function* fixtureRecords(records) {
    yield* records;
  }
  const lazyStaging = path.join(root, '.astro', 'lazy-staging');
  let yieldedBlogs = 0;
  /** Yield a record only after the preceding record's generated card exists.
   * @yields One normalized record representing a separately requested CMS page.
   */
  async function* lazyBlogs() {
    for (let index = 0; index < 3; index++) {
      if (index > 0) {
        assert.ok(
          await stat(path.join(lazyStaging, 'og-images/blog', `lazy-${index - 1}-default.jpg`)),
        );
      }
      yieldedBlogs++;
      yield {
        id: `lazy-${index}`,
        slug: `lazy-${index}`,
        title: `Lazy ${index}`,
        body: ['rich-text-must-not-be-retained'],
      };
    }
  }
  /** Fail if image and sitemap preparation request review records.
   * @yields Nothing; review content is not needed by either consumer.
   */
  async function* unusedReviews() {
    throw new Error('Reviews must not be fetched during image or route preparation');
  }
  const lazyIntegration = publicImagesIntegration({
    /** Create one-shot streams without requesting their records.
     * @returns Lazy collections whose blog stream proves record-by-record backpressure.
     */
    loadPublishedCollections: async () => ({
      blogs: oneShot(lazyBlogs()),
      conditions: oneShot(fixtureRecords([])),
      clinics: oneShot(fixtureRecords([])),
      providers: oneShot(fixtureRecords([{ id: 'provider-one', slug: 'provider-one' }])),
      serviceUpdates: oneShot(
        fixtureRecords([{ id: 'update-one', slug: 'update-one', date: '2026-10-29' }]),
      ),
      reviews: oneShot(unusedReviews()),
    }),
    stagingDir: lazyStaging,
    cacheDir: path.join(root, '.astro', 'lazy-cache'),
  });
  assert.equal(yieldedBlogs, 0, 'creating collection streams is lazy');
  await lazyIntegration.hooks['astro:config:setup']({
    config: { output: 'static' },
    command: 'build',
  });
  await lazyIntegration.hooks['astro:build:start']({ logger: { info() {} } });
  assert.equal(yieldedBlogs, 3);
  const indexText = await readFile(process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH, 'utf8');
  assert.doesNotMatch(indexText, /rich-text-must-not-be-retained|"body"/);
  const index = JSON.parse(indexText).result;
  assert.equal(
    index.routes.length,
    5,
    'provider and service-update routes are indexed without image work',
  );
  assert.equal(index.cards.length, 3);
  await lazyIntegration.hooks['astro:build:done']({
    dir: pathToFileURL(`${outputDir}${path.sep}`),
  });
  const duplicateIntegration = publicImagesIntegration({
    /** Return two records with a duplicate route in separate lazy iterations.
     * @returns Published route streams containing a deliberate late duplicate.
     */
    loadPublishedCollections: async () => ({
      blogs: oneShot(
        fixtureRecords([
          { id: 'first', slug: 'duplicate', title: 'First' },
          { id: 'second', slug: 'duplicate', title: 'Second' },
        ]),
      ),
      conditions: [],
      clinics: [],
      providers: [],
      serviceUpdates: [],
      reviews: unusedReviews(),
    }),
    stagingDir: path.join(root, '.astro', 'duplicate-staging'),
    cacheDir: path.join(root, '.astro', 'duplicate-cache'),
  });
  await duplicateIntegration.hooks['astro:config:setup']({
    config: { output: 'static' },
    command: 'build',
  });
  await assert.rejects(
    duplicateIntegration.hooks['astro:build:start']({ logger: { info() {} } }),
    /Published content contains duplicate routes/,
  );
  assert.equal(process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID, undefined);
  assert.equal(process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH, undefined);
  await assert.rejects(access(path.join(outputDir, 'og-images/blog/duplicate-default.jpg')), {
    code: 'ENOENT',
  });
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.GATSBY_STRAPI_API_URL;
  const originalMediaHosts = process.env.STRAPI_MEDIA_HOSTS;
  let cdnReads = 0;
  try {
    process.env.GATSBY_STRAPI_API_URL = 'https://admin.aascmed.com';
    delete process.env.STRAPI_MEDIA_HOSTS;
    /** Serve the project's separate public media CDN without making network requests.
     * @param {string | URL} url Approved CDN image URL requested by the integration.
     * @returns {Promise<Response>} Deterministic source image bytes.
     */
    globalThis.fetch = async (url) => {
      assert.equal(new URL(url).hostname, 'wise-positivity-21c2bd6b3f.media.strapiapp.com');
      cdnReads++;
      return new Response(svg('#2b60d4'), { headers: { 'content-type': 'image/svg+xml' } });
    };
    const cdnCollections = collectionsFor('Published CDN image');
    cdnCollections.blogs[0].thumbnail.src =
      'https://wise-positivity-21c2bd6b3f.media.strapiapp.com/cover.svg';
    const cdnIntegration = publicImagesIntegration({
      /** Supply published content whose media uses the separate project CDN.
       * @returns {Promise<PublishedCollections>} The CDN-backed fixture collections.
       */
      loadPublishedCollections: async () => {
        return cdnCollections;
      },
      stagingDir: path.join(root, '.astro', 'cdn-staging'),
      cacheDir: path.join(root, '.astro', 'cdn-cache'),
    });
    await cdnIntegration.hooks['astro:config:setup']({
      config: { output: 'static' },
      command: 'build',
    });
    await cdnIntegration.hooks['astro:build:start']({ logger: { info() {} } });
    assert.ok(
      cdnReads > 0,
      'the separate project CDN is allowed without extra environment configuration',
    );
    await cdnIntegration.hooks['astro:build:done']({
      dir: pathToFileURL(`${outputDir}${path.sep}`),
    });
  } finally {
    globalThis.fetch = originalFetch;
    if (originalApiUrl === undefined) {
      delete process.env.GATSBY_STRAPI_API_URL;
    } else {
      process.env.GATSBY_STRAPI_API_URL = originalApiUrl;
    }
    if (originalMediaHosts === undefined) {
      delete process.env.STRAPI_MEDIA_HOSTS;
    } else {
      process.env.STRAPI_MEDIA_HOSTS = originalMediaHosts;
    }
  }
  console.log(
    'Public image build hook passed: static-only execution, per-build private index identity, nested route/card preservation, cleanup, changed-content regeneration, and unchanged-card reuse.',
  );
} finally {
  await process.chdir(originalCwd);
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID;
  delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
  await rm(root, { recursive: true, force: true });
}
