// Deterministic fixtures for shared social-card rendering, caching and path safety.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { buildSocialCards } from '../../astro/src/lib/public-images.mjs';
test('shared social cards preserve paths, orientation, cache keys and remote-fetch boundaries', async () => {
  const require = createRequire(import.meta.url);
  const gatsbyGenerator = require('../../gatsby/og-image-generator.js');
  const root = await mkdtemp(path.join(os.tmpdir(), 'aasc-public-images-'));
  const publicDir = path.join(root, 'public');
  const cacheDir = path.join(root, 'cache');
  const sourcePath = path.join(root, 'cover.svg');
  const missingPath = path.join(root, 'missing.jpg');
  /** Create a small deterministic SVG fixture with the requested fill color.
   * @param {string} color CSS fill color used by the fixture rectangle.
   * @returns {string} SVG document source for image-generation fixtures.
   */
  const svg = (color) => {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${color}"/></svg>`;
  };
  try {
    await assert.rejects(
      buildSocialCards([], {
        publicDir,
        cacheDir: path.join(publicDir, 'unsafe-cache'),
      }),
      /cache must be outside the public output directory/,
    );
    await mkdir(publicDir, { recursive: true });
    await writeFile(sourcePath, svg('#e94b35'));
    await assert.rejects(
      buildSocialCards(
        [
          {
            kind: 'blog',
            slug: 'bad/../slug',
            title: 'Unsafe route',
          },
        ],
        { publicDir, cacheDir },
      ),
      /Invalid public image path/,
    );
    for (const unsafeSlug of [
      '../escape',
      'nested/../../escape',
      'encoded/%2f/escape',
      'query?value',
      'fragment#value',
      'empty//segment',
      'backslash\\segment',
    ]) {
      await assert.rejects(
        buildSocialCards(
          [{ kind: 'blog', slug: unsafeSlug, title: 'Unsafe route' }],
          {
            publicDir,
            cacheDir,
          },
        ),
        /Invalid public image path/,
        `unsafe slug segment is rejected: ${unsafeSlug}`,
      );
    }
    const entry = {
      kind: 'blog',
      slug: 'fixture-post',
      title: 'Fixture social card',
      backgroundImage: sourcePath,
    };
    const first = await buildSocialCards([entry], { publicDir, cacheDir });
    assert.equal(first[0].imagePath, '/og-images/blog/fixture-post-cover.jpg');
    assert.equal(first[0].wasCached, false);
    assert.deepEqual(
      await sharp(first[0].outputPath)
        .metadata()
        .then(({ width, height }) => [width, height]),
      [1200, 630],
    );
    const same = await buildSocialCards([entry], { publicDir, cacheDir });
    assert.equal(
      same[0].wasCached,
      true,
      'an unchanged image and title reuse the cached card',
    );
    const unicodeSlugCards = await buildSocialCards(
      [
        { kind: 'blog', slug: 'cafe', title: 'Cafe' },
        { kind: 'blog', slug: 'café', title: 'Café' },
      ],
      {
        publicDir: path.join(root, 'unicode-slug-public'),
        cacheDir: path.join(root, 'unicode-slug-cache'),
      },
    );
    assert.notEqual(
      unicodeSlugCards[0].imagePath,
      unicodeSlugCards[1].imagePath,
      'distinct shared-route-valid slugs keep distinct public image URLs',
    );
    assert.notEqual(
      unicodeSlugCards[0].outputPath,
      unicodeSlugCards[1].outputPath,
      'distinct shared-route-valid slugs do not overwrite one another',
    );
    await assert.rejects(
      buildSocialCards(
        [
          { kind: 'blog', slug: 'duplicate', title: 'First duplicate' },
          { kind: 'blog', slug: 'duplicate', title: 'Second duplicate' },
        ],
        {
          publicDir: path.join(root, 'duplicate-public'),
          cacheDir: path.join(root, 'duplicate-cache'),
        },
      ),
      /Duplicate public image output path/,
    );
    const streamedPublicDir = path.join(root, 'streamed-public');
    /** Supply the next card only after the preceding output exists, then repeat a path across an async boundary.
     * @yields {import('../../astro/src/lib/public-images.mjs').SocialCardEntry} One card input at a time.
     */
    async function* streamedEntries() {
      yield { kind: 'blog', slug: 'streamed', title: 'First streamed card' };
      assert.ok(
        await stat(
          path.join(streamedPublicDir, 'og-images/blog/streamed-default.jpg'),
        ),
      );
      yield { kind: 'blog', slug: 'streamed', title: 'Duplicate later card' };
    }
    await assert.rejects(
      buildSocialCards(streamedEntries(), {
        publicDir: streamedPublicDir,
        cacheDir: path.join(root, 'streamed-cache'),
      }),
      /Duplicate public image output path/,
      'streaming renders before pulling another input and retains collision detection across yields',
    );
    await writeFile(sourcePath, svg('#305de9'));
    const changed = await buildSocialCards([entry], { publicDir, cacheDir });
    assert.equal(
      changed[0].imagePath,
      first[0].imagePath,
      'media updates preserve the existing public URL',
    );
    assert.equal(
      changed[0].wasCached,
      false,
      'media bytes invalidate the card even at the same path',
    );
    const changedBytes = await readFile(changed[0].outputPath);
    const repeat = await buildSocialCards([entry], {
      publicDir: path.join(root, 'repeat-public'),
      cacheDir: path.join(root, 'repeat-cache'),
    });
    assert.deepEqual(
      await readFile(repeat[0].outputPath),
      changedBytes,
      'identical inputs produce byte-identical cards',
    );
    const missing = await buildSocialCards(
      [
        {
          kind: 'conditions',
          slug: 'missing-thumbnail',
          title: 'Available without a thumbnail',
          backgroundImage: missingPath,
        },
      ],
      { publicDir, cacheDir },
    );
    assert.equal(missing[0].wasCached, false);
    assert.deepEqual(
      await sharp(missing[0].outputPath)
        .metadata()
        .then(({ width, height }) => [width, height]),
      [1200, 630],
    );
    const mapboxToken = 'pk-fixture-not-for-output';
    let mapboxCalledForMap = false;
    const mapCard = await buildSocialCards(
      [
        {
          kind: 'clinics',
          slug: 'fixture-clinic',
          title: 'Fixture clinic',
          mapLocation: { latitude: 42.3, longitude: -71.1 },
        },
      ],
      {
        publicDir,
        cacheDir,
        mapboxToken,
        fetch: async (input) => {
          const url = new URL(String(input));
          mapboxCalledForMap =
            url.hostname === 'api.mapbox.com' &&
            url.searchParams.get('access_token') === mapboxToken;
          return new Response(await readFile(sourcePath), {
            headers: { 'content-type': 'image/svg+xml' },
          });
        },
      },
    );
    assert.equal(
      mapboxCalledForMap,
      true,
      'only generated clinic map assets may use the fixed Mapbox host',
    );
    assert.equal(
      (await readFile(mapCard[0].outputPath)).includes(
        Buffer.from(mapboxToken),
      ),
      false,
    );
    assert.equal(
      (
        await readFile(path.join(cacheDir, 'social-cards.json'), 'utf8')
      ).includes(mapboxToken),
      false,
    );
    let arbitraryMapboxFetch = false;
    const arbitraryMapboxCard = await buildSocialCards(
      [
        {
          kind: 'clinics',
          slug: 'arbitrary-mapbox',
          title: 'Fallback',
          backgroundImage: 'https://api.mapbox.com/private-resource.png',
        },
      ],
      {
        publicDir,
        cacheDir,
        fetch: async () => {
          arbitraryMapboxFetch = true;
          throw new Error('unexpected fetch');
        },
      },
    );
    assert.equal(
      arbitraryMapboxFetch,
      false,
      'arbitrary CMS URLs cannot use the Mapbox host',
    );
    assert.equal(arbitraryMapboxCard[0].wasCached, false);
    const configuredOrigin = 'https://cms.example.test:8443';
    const fetchedOrigins = [];
    const configuredMedia = await buildSocialCards(
      [
        {
          kind: 'blog',
          slug: 'configured-origin',
          title: 'Configured CMS',
          backgroundImage: `${configuredOrigin}/cover.svg`,
        },
      ],
      {
        publicDir,
        cacheDir,
        allowedMediaOrigins: [configuredOrigin],
        fetch: async (input) => {
          fetchedOrigins.push(new URL(String(input)).origin);
          return new Response(await readFile(sourcePath));
        },
      },
    );
    assert.deepEqual(
      fetchedOrigins,
      [configuredOrigin],
      'configured HTTPS ports are accepted for social-card media',
    );
    assert.ok(await stat(configuredMedia[0].outputPath));
    let unconfiguredOriginFetched = false;
    await buildSocialCards(
      [
        {
          kind: 'blog',
          slug: 'other-origin',
          title: 'Unconfigured port',
          backgroundImage: 'https://cms.example.test:9443/cover.svg',
        },
      ],
      {
        publicDir,
        cacheDir,
        allowedMediaOrigins: [configuredOrigin],
        fetch: async () => {
          unconfiguredOriginFetched = true;
          return new Response(await readFile(sourcePath));
        },
      },
    );
    assert.equal(
      unconfiguredOriginFetched,
      false,
      'an unconfigured port must never be requested',
    );
    const gatsbyOutput = path.join(root, 'gatsby-adapter.jpg');
    await gatsbyGenerator.generateOGImage({
      title: 'Gatsby adapter fixture',
      backgroundImagePath: sourcePath,
      outputPath: gatsbyOutput,
    });
    assert.deepEqual(
      await sharp(gatsbyOutput)
        .metadata()
        .then(({ width, height }) => [width, height]),
      [1200, 630],
    );
    console.log(
      'Public image fixtures passed: deterministic social-card bytes, cache behavior, safe paths, private cache placement, and Mapbox token isolation.',
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
