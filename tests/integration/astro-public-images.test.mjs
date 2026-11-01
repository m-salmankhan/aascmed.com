// Mocked Strapi static-build fixture for Astro image output, card caching, and secret isolation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
test('Astro static builds use astro:assets for CMS thumbnails and cache social cards', async () => {
  /** @typedef {import('../../astro/src/server/content/loaders.ts').PublishedCollections} PublishedCollections */
  const astroRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../astro',
  );
  const fixtureSrcDir = path.join(astroRoot, '.astro', 'public-images-pages-fixture');
  const routePath = path.join(fixtureSrcDir, 'pages', 'public-image-fixture.astro');
  const configPath = path.join(
    astroRoot,
    'astro.config.public-images-fixture.mjs',
  );
  const outputDir = path.join(astroRoot, 'dist-public-images-fixture');
  const stagingDir = path.join(astroRoot, '.astro', 'public-images-fixture');
  const cacheDir = path.join(astroRoot, '.astro', 'public-image-cache-fixture');
  /** Create a deterministic JPEG served as the current CMS image.
   * @param {string} color Sharp background color for the current fixture version.
   * @returns {Promise<Buffer>} Encoded image bytes read by Astro's image service and the social-card renderer.
   */
  const jpeg = async (color) => {
    return sharp({
      create: { width: 3000, height: 2000, channels: 3, background: color },
    })
      .jpeg()
      .toBuffer();
  };
  let imageBytes = await jpeg('#df4b31');
  let blogTitle = 'Fixture version one';
  const requests = [];
  /** Scan the public output recursively for the sentinel server token or a CMS rich-text body.
   * @param {string} directory Public build directory to inspect.
   * @returns Promise<void>; throws at the first public file containing a forbidden build value.
   */
  async function assertPublicOutputContainsNoBuildSecrets(directory) {
    for (const entry of await import('node:fs/promises').then(({ readdir }) =>
      readdir(directory, { withFileTypes: true }),
    )) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await assertPublicOutputContainsNoBuildSecrets(fullPath);
      } else {
        const body = (await readFile(fullPath)).toString('utf8');
        assert.doesNotMatch(
          body,
          /fixture-server-secret-never-publish|rich-text-must-not-be-retained/,
        );
      }
    }
  }
  for (const target of [
    fixtureSrcDir,
    configPath,
    outputDir,
    stagingDir,
    cacheDir,
  ]) {
    await assert.rejects(
      stat(target),
      { code: 'ENOENT' },
      `Refusing to overwrite existing fixture path: ${target}`,
    );
  }
  const mockApi = createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/uploads/icon.svg') {
      response.writeHead(200, { 'content-type': 'image/svg+xml' });
      response.end('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="green"/></svg>');
      return;
    }
    if (url.pathname === '/uploads/cover.jpg') {
      response.writeHead(200, {
        'content-type': 'image/jpeg',
        'content-length': imageBytes.length,
        etag: `"${createHash('sha256').update(imageBytes).digest('hex')}"`,
        'cache-control': 'no-cache',
      });
      response.end(imageBytes);
      return;
    }
    const kind = url.pathname.split('/').filter(Boolean).at(-1);
    if (
      ![
        'blogs',
        'clinics',
        'conditions',
        'providers',
        'service-updates',
      ].includes(kind)
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    const page = Number(url.searchParams.get('pagination[page]') || 1);
    const field = kind === 'service-updates' ? 'date' : 'order';
    const partition = url.searchParams.has(`filters[${field}][$notNull]`)
      ? 'present'
      : url.searchParams.has(`filters[${field}][$null]`)
        ? 'missing'
        : 'all';
    requests.push({
      kind,
      page,
      partition,
      status: url.searchParams.get('status'),
    });
    const pageSize = Number(url.searchParams.get('pagination[pageSize]') || 2);
    if (kind === 'blogs' && page === 2 && !url.searchParams.has('fields[0]')) {
      assert.ok(
        await stat(
          path.join(stagingDir, 'og-images/blog/fixture-post-cover.jpg'),
        ),
        'the first CMS page is processed before the next page is requested',
      );
    }
    const records =
      kind === 'blogs'
        ? [
            {
              id: 1,
              documentId: 'fixture-blog',
              slug: 'fixture-post',
              title: blogTitle,
              heading: blogTitle,
              thumbnail: {
                url: '/uploads/cover.jpg',
                alternativeText: 'Fixture cover',
                width: 3000,
                height: 2000,
                mime: 'image/jpeg',
              },
              content: [{ text: 'rich-text-must-not-be-retained' }],
            },
            {
              id: 2,
              documentId: 'fixture-blog-two',
              slug: 'fixture-second',
              title: 'Second post',
            },
            {
              id: 3,
              documentId: 'fixture-blog-three',
              slug: 'fixture-third',
              title: 'Third post',
            },
          ]
        : [];
    const data = records.slice((page - 1) * pageSize, page * pageSize);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        data,
        meta: {
          pagination: {
            pageCount: Math.max(1, Math.ceil(records.length / pageSize)),
            total: records.length,
          },
        },
      }),
    );
  });
  await new Promise((resolve) => mockApi.listen(0, '127.0.0.1', resolve));
  const address = mockApi.address();
  assert.ok(address && typeof address === 'object');
  const fixtureRoute = `
  ---
  import { getBlogs } from '../../../src/server/content/loaders.ts';
  import { Image } from '../../../../src/components/media/image.tsx';
  import { getResponsiveMediaDescriptor } from '../../../src/server/content/astro-media.ts';
  let sourceMedia;
  for await (const blog of getBlogs('published', { pageSize: 2 })) {
    if (blog.slug === 'fixture-post') {
      sourceMedia = blog.thumbnail;
      break;
    }
  }
  const media = sourceMedia ? await getResponsiveMediaDescriptor(sourceMedia, { width: 300, aspectRatio: 1 }) : undefined;
  const wide = sourceMedia ? await getResponsiveMediaDescriptor(sourceMedia, { width: 2400, layout: 'full-width', sizes: '100vw' }) : undefined;
  const vector = sourceMedia ? await getResponsiveMediaDescriptor({ ...sourceMedia, src: new URL('/uploads/icon.svg', sourceMedia.src).href, mimeType: 'image/svg+xml' }, { width: 300 }) : undefined;
  ---
  <html><body>
    <div id="thumbnail">{media && <Image image={media} />}</div>
    <div id="wide">{wide && <Image image={wide} />}</div>
    <div id="vector">{vector && <Image image={vector} />}</div>
  </body></html>
  `;
  const fixtureConfig = `
  import base from './astro.config.static.ts';
  import { mediaOrigins } from './astro.config.shared.ts';
  import { publicImagesIntegration } from './src/integrations/public-images.ts';
  import path from 'node:path';
  const integration = publicImagesIntegration({
    loadPublishedCollections: async () => {
      const { getPublishedCollections } = await import('./src/server/content/loaders.ts');
      return getPublishedCollections({ pageSize: 2 });
    },
    allowedMediaOrigins: mediaOrigins,
    stagingDir: path.resolve('.astro/public-images-fixture'),
    cacheDir: path.resolve('.astro/public-image-cache-fixture'),
  });
  const integrations = base.integrations.filter((item) => item.name !== 'aasc-public-images');
  export default { ...base, srcDir: './.astro/public-images-pages-fixture', outDir: './dist-public-images-fixture', integrations: [...integrations, integration] };
  `;
  /** Run one isolated Astro static build against the local CMS/media fixture.
   * @returns Promise<number> Number of CMS collection requests served during the build.
   */
  const runStaticBuild = async () => {
    const startIndex = requests.length;
    const cli = path.join(
      astroRoot,
      'node_modules',
      'astro',
      'bin',
      'astro.mjs',
    );
    const build = spawn(
      process.execPath,
      [cli, 'build', '--config', path.basename(configPath)],
      {
        cwd: astroRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          ASTRO_CONTENT_MODE: 'published',
          STRAPI_API_URL: `http://127.0.0.1:${address.port}/api`,
          STRAPI_TOKEN: 'fixture-server-secret-never-publish',
        },
      },
    );
    const code = await new Promise((resolve, reject) => {
      build.once('error', reject);
      build.once('close', resolve);
    });
    assert.equal(code, 0, 'Astro static fixture build succeeds');
    const buildRequests = requests.slice(startIndex);
    assert.ok(
      buildRequests.every(({ status }) => status === 'published'),
      'build reads only published CMS collections',
    );
    for (const kind of ['blogs', 'conditions', 'clinics']) {
      assert.ok(
        buildRequests.some((request) => request.kind === kind),
        `${kind} is consumed by the social-card hook`,
      );
    }
    return buildRequests.length;
  };
  try {
    await mkdir(path.dirname(routePath), { recursive: true });
    await writeFile(configPath, fixtureConfig, 'utf8');
    await writeFile(routePath, fixtureRoute, 'utf8');
    await runStaticBuild();
    const routeHtml = path.join(
      outputDir,
      'public-image-fixture',
      'index.html',
    );
    const htmlFirst = await readFile(routeHtml, 'utf8');
    assert.match(htmlFirst, /src="\/_astro\/[^\"]+\.jpg/);
    assert.match(htmlFirst, /srcset="[^"]+\.jpg \d+w/i);
    const thumbnailHtml = htmlFirst.match(/<div id="thumbnail">([\s\S]*?)<\/div>/)?.[1];
    const wideHtml = htmlFirst.match(/<div id="wide">([\s\S]*?)<\/div>/)?.[1];
    assert.ok(thumbnailHtml && wideHtml);
    assert.match(thumbnailHtml, /width="300" height="300"/);
    assert.match(wideHtml, /width="2400" height="1600"/);
    assert.match(htmlFirst, /\.webp \d+w/);
    assert.match(thumbnailHtml, /sizes="auto"/, 'lazy images advertise their actual layout slot');
    await assertPublicOutputContainsNoBuildSecrets(outputDir);
    const mediaSrc = htmlFirst.match(/src="(\/_astro\/[^\"]+\.jpg)"/)?.[1];
    assert.ok(mediaSrc);
    assert.ok(await stat(path.join(outputDir, mediaSrc.slice(1))));
    const dimensions = await sharp(path.join(outputDir, mediaSrc.slice(1))).metadata();
    assert.equal(dimensions.width, 300, 'native output follows the 300px thumbnail slot');
    assert.equal(dimensions.height, 300);
    const mediaUrls = [
      ...htmlFirst.matchAll(/\/_astro\/[^\s"&,]+\.(?:avif|webp|jpg)/g),
    ].map(([url]) => url);
    assert.ok(mediaUrls.some((url) => url.endsWith('.avif')));
    assert.ok(mediaUrls.some((url) => url.endsWith('.webp')));
    for (const url of new Set(mediaUrls)) {
      assert.ok(
        await stat(path.join(outputDir, url.slice(1))),
        `${url} is emitted by Astro`,
      );
    }
    const thumbnailUrls = [...thumbnailHtml.matchAll(/\/_astro\/[^\s"&,]+\.(?:avif|webp|jpg)/g)].map(([url]) => url);
    for (const url of new Set(thumbnailUrls)) {
      const candidate = await sharp(path.join(outputDir, url.slice(1))).metadata();
      assert.ok(candidate.width <= 600, 'Astro constrains thumbnail variants to the slot and 2x density');
      assert.equal(candidate.width, candidate.height, 'the existing square crop is preserved');
    }
    const wideSrc = wideHtml.match(/src="(\/_astro\/[^\"]+\.jpg)"/)?.[1];
    assert.ok(wideSrc);
    assert.equal((await sharp(path.join(outputDir, wideSrc.slice(1))).metadata()).width, 2400,
      'wide native output can exceed 1920px when its display width requires it');
    const vectorHtml = htmlFirst.match(/<div id="vector">([\s\S]*?)<\/div>/)?.[1];
    const vectorSrc = vectorHtml?.match(/src="(\/_astro\/[^\"]+\.svg)"/)?.[1];
    assert.ok(vectorSrc, 'remote SVG also uses a generated local build URL');
    assert.match(await readFile(path.join(outputDir, vectorSrc.slice(1)), 'utf8'), /<svg/);
    const cardPath = path.join(
      outputDir,
      'og-images',
      'blog',
      'fixture-post-cover.jpg',
    );
    const cardFirst = await readFile(cardPath);
    const mediaFirst = await readFile(path.join(outputDir, mediaSrc.slice(1)));
    blogTitle = 'Fixture version two';
    imageBytes = await jpeg('#2b60d4');
    await runStaticBuild();
    const htmlSecond = await readFile(routeHtml, 'utf8');
    const cardSecond = await readFile(cardPath);
    const mediaSrcSecond = htmlSecond.match(
      /src="(\/_astro\/[^\"]+\.jpg)"/,
    )?.[1];
    assert.ok(mediaSrcSecond);
    const mediaSecond = await readFile(
      path.join(outputDir, mediaSrcSecond.slice(1)),
    );
    assert.notDeepEqual(
      cardSecond,
      cardFirst,
      'changed published content and media refresh the card at its stable URL',
    );
    assert.notDeepEqual(
      mediaSecond,
      mediaFirst,
      'Astro refreshes optimized output when the remote image changes at the same URL',
    );
    await runStaticBuild();
    const cardThird = await readFile(cardPath);
    assert.deepEqual(
      cardThird,
      cardSecond,
      'unchanged public cards reuse deterministic cached output',
    );
  } finally {
    await new Promise((resolve) => mockApi.close(resolve));
    await rm(fixtureSrcDir, { recursive: true, force: true });
    await rm(configPath, { force: true });
    await rm(outputDir, { recursive: true, force: true });
    await rm(stagingDir, { recursive: true, force: true });
    await rm(cacheDir, { recursive: true, force: true });
  }
});
