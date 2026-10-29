// Deterministic fixtures for shared social-card rendering and responsive public image outputs.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  buildResponsiveImage,
  buildSocialCards,
} from '../src/lib/public-images.ts';
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
  const media = await buildResponsiveImage({
    source: sourcePath,
    alt: 'Fixture image',
    outputDir: path.join(publicDir, 'media'),
    publicUrlPrefix: '/media',
    filename: 'fixture',
    widths: [320, 640],
  });
  assert.equal(media.width, 900);
  assert.equal(media.height, 600);
  assert.match(media.formats?.[0]?.srcSet || '', /\.avif 320w/);
  assert.match(media.formats?.[1]?.srcSet || '', /\.webp 640w/);
  assert.equal(
    media.sources?.length,
    3,
    'candidate widths include the original image width',
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
    (await readFile(mapCard[0].outputPath)).includes(Buffer.from(mapboxToken)),
    false,
  );
  assert.equal(
    (await readFile(path.join(cacheDir, 'social-cards.json'), 'utf8')).includes(
      mapboxToken,
    ),
    false,
  );
  let allowedRemoteFetch = false;
  const remoteMedia = await buildResponsiveImage({
    source: 'https://media.example.test/cover.svg',
    alt: 'Approved remote fixture',
    outputDir: path.join(publicDir, 'remote-media'),
    publicUrlPrefix: '/remote-media',
    widths: [320],
    allowedMediaHosts: ['media.example.test'],
    fetch: async (_url, init) => {
      allowedRemoteFetch = init?.redirect === 'error';
      return new Response(await readFile(sourcePath), {
        headers: { 'content-type': 'image/svg+xml' },
      });
    },
  });
  assert.equal(
    allowedRemoteFetch,
    true,
    'approved remote hosts are fetched without following redirects',
  );
  assert.equal(remoteMedia.width, 900);
  let blockedRemoteFetch = false;
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
  await assert.rejects(
    buildResponsiveImage({
      source: 'https://127.0.0.1/private.jpg',
      alt: 'Blocked URL',
      outputDir: path.join(root, 'blocked'),
      publicUrlPrefix: '/blocked',
      fetch: async () => {
        blockedRemoteFetch = true;
        throw new Error('fetch must not run');
      },
    }),
    /Remote image host is not allowed/,
  );
  assert.equal(
    blockedRemoteFetch,
    false,
    'unapproved image hosts are rejected before network access',
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
    'Public image fixtures passed: deterministic bytes, cache hit, same-path media change, absent thumbnail, safe slug segments, private cache placement, Mapbox token isolation, approved and blocked remote hosts, and responsive AVIF/WebP/JPEG output.',
  );
} finally {
  await rm(root, { recursive: true, force: true });
}
