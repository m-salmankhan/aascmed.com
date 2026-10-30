// Exercises real Astro static/SSR pages against an isolated, mutable Strapi HTTP fixture.
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import {
  astroRoot,
  availablePort,
  command,
  build,
  ready,
  stop,
} from '../fixtures/astro-cms/process.mjs';
import { startFixtureCms, fixtureToken, draftMarker } from '../fixtures/astro-cms/server.mjs';
const routes = [
  ['/', 'PUBLISHED GENERIC copy'],
  ['/blog/', 'PUBLISHED blog-archive'],
  ['/conditions/', 'PUBLISHED conditions-archive'],
  ['/providers/', 'PUBLISHED providers-page'],
  ['/clinics/', 'PUBLISHED clinics-archive'],
  ['/service-updates/', 'PUBLISHED service-update-page'],
  ['/contact/', 'PUBLISHED contact'],
  ['/privacy/', 'PUBLISHED privacy-policy'],
  ['/blog/article-1/', 'PUBLISHED BLOG_BODY_1'],
  ['/blog/article-2/', 'PUBLISHED BLOG_BODY_2'],
  ['/blog/article-3/', 'PUBLISHED BLOG_BODY_3'],
  ['/conditions/allergy/', 'PUBLISHED CONDITION_BODY'],
  ['/providers/doctor-example/', 'PUBLISHED PROVIDER_BODY'],
  ['/clinics/example-clinic/', 'PUBLISHED CLINIC_BODY'],
  ['/service-updates/2026/03/notice/', 'PUBLISHED UPDATE_BODY'],
];
/** Scan every public build file for draft copy and server-only credentials.
 * @param directory Static output directory, traversed recursively.
 * @returns Nothing; any leaked marker or token fails with its public artifact path.
 */
async function assertPublicArtifacts(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await assertPublicArtifacts(file);
    } else {
      const bytes = await readFile(file);
      assert.equal(
        bytes.includes(Buffer.from(draftMarker)),
        false,
        `Draft content leaked into ${file}`,
      );
      assert.equal(
        bytes.includes(Buffer.from(fixtureToken)),
        false,
        `CMS token leaked into ${file}`,
      );
    }
  }
}
/** Check a generated document's metadata and every JSON-LD payload before hydration.
 * @param html Initial response HTML.
 * @param pathname Expected public canonical route.
 * @returns Parsed JSON-LD entries for page-family-specific assertions.
 */
function assertDocument(html, pathname) {
  assert.ok(html.includes(`href="https://www.aascmed.com${pathname}"`), `${pathname} canonical`);
  assert.ok(/<title>[^<]+<\/title>/.test(html), `${pathname} title`);
  assert.ok(html.includes('name="description"'), `${pathname} description`);
  const entries = [
    ...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ].map((match) => JSON.parse(match[1]));
  assert.equal(html.includes(fixtureToken), false, `${pathname} must not expose CMS credentials`);
  return entries;
}
test(
  'published Astro output and request-time drafts remain isolated across every page family',
  { timeout: 240000 },
  async () => {
    const cms = await startFixtureCms();
    const env = {
      ...process.env,
      DEBUG: '',
      GATSBY_STRAPI_API_URL: cms.origin,
      STRAPI_TOKEN: fixtureToken,
      STRAPI_MEDIA_ORIGINS: cms.origin,
      ASTRO_CONTENT_MODE: 'draft',
      PUBLIC_MAPBOX_API_KEY: '',
      GATSBY_MAPBOX_API_KEY: '',
      PUBLIC_RUNTIME_API_BASE_URL: 'https://example.com',
    };
    let staticServer;
    let previewServer;
    let browser;
    try {
      await build('astro.config.static.ts', env);
      assert.ok(cms.requests.length > 0);
      assert.ok(
        cms.requests.every(({ query }) => query.status === 'published'),
        'static build never requests saved drafts, even when preview is configured',
      );
      assert.ok(
        cms.requests.some(
          ({ pathname, query }) => pathname === '/api/blogs' && Number(query.pagination?.page) > 1,
        ),
        'actual static pages consume more than the first CMS page',
      );
      await assertPublicArtifacts(path.join(astroRoot, 'dist-static'));
      const sitemap = await readFile(path.join(astroRoot, 'dist-static/sitemap-0.xml'), 'utf8');
      for (const [pathname] of routes) {
        assert.ok(
          sitemap.includes(`https://www.aascmed.com${pathname}`),
          `${pathname} appears in the published sitemap`,
        );
      }
      assert.ok(!sitemap.includes('draft-new'));
      assert.ok(sitemap.includes('<lastmod>2026-04-03T14:20:00.000Z</lastmod>'));
      browser = await chromium.launch();
      const noJs = await browser.newContext({ javaScriptEnabled: false });
      await noJs.route('**/*', (route) => {
        const hostname = new URL(route.request().url()).hostname;
        return ['127.0.0.1', 'localhost'].includes(hostname) ? route.continue() : route.abort();
      });
      const page = await noJs.newPage();
      const staticPort = await availablePort();
      const staticOrigin = `http://127.0.0.1:${staticPort}`;
      staticServer = command(
        [
          'node_modules/astro/bin/astro.mjs',
          'preview',
          '--config',
          'astro.config.static.ts',
          '--host',
          '127.0.0.1',
          '--port',
          String(staticPort),
        ],
        env,
      );
      await ready(staticServer, staticOrigin);
      for (const [pathname, marker] of routes) {
        const response = await page.goto(`${staticOrigin}${pathname}`, {
          waitUntil: 'domcontentloaded',
        });
        assert.equal(response.status(), 200, `${pathname} published status`);
        const html = await response.text();
        const jsonLd = assertDocument(html, pathname);
        assert.ok(
          (await page.locator('body').innerText()).includes(marker),
          `${pathname} meaningful content exists without JavaScript`,
        );
        assert.ok(
          (await page.getByRole('heading').count()) > 0,
          `${pathname} exposes structured headings`,
        );
        assert.ok(!html.includes(draftMarker));
        assert.ok(!html.includes('noindex, nofollow'), `${pathname} is indexable`);
        if (pathname === '/conditions/allergy/') {
          assert.ok(jsonLd.some((entry) => entry['@type'] === 'FAQPage'));
        }
        if (pathname === '/blog/article-1/') {
          assert.ok(html.includes('G-FIXTURE'), 'public articles retain enabled analytics');
        }
        if (pathname === '/blog/article-1/') {
          const inline = page.getByRole('img', { name: 'Fixture inline image' });
          const src = await inline.getAttribute('src');
          assert.match(src, /^\/_astro\//, 'embedded CMS images are native local static assets');
          assert.ok((await inline.getAttribute('srcset')).includes('/_astro/'));
          assert.equal((await fetch(new URL(src, staticOrigin))).status, 200);
        }
        if (pathname === '/providers/doctor-example/') {
          const social = html.match(/property="og:image" content="([^"]+)"/)?.[1];
          assert.ok(social);
          assert.match(new URL(social).pathname, /^\/_astro\//, 'provider social metadata uses a local image');
          assert.equal((await fetch(new URL(new URL(social).pathname, staticOrigin))).status, 200);
        }
        if (pathname === '/clinics/example-clinic/') {
          const clinic = jsonLd.find((entry) => entry['@type'] === 'MedicalClinic');
          assert.ok(clinic);
          assert.equal(
            clinic.url,
            `https://www.aascmed.com${pathname}`,
            'clinic JSON-LD uses the actual explicit route',
          );
        }
      }
      assert.equal((await fetch(`${staticOrigin}/blog/draft-new/`)).status, 404);
      await stop(staticServer);
      staticServer = undefined;
      const beforeSsrBuild = cms.requests.length;
      await build('astro.config.ssr.ts', env);
      assert.ok(
        cms.requests.slice(beforeSsrBuild).every(({ query }) => query.status === 'published'),
        'SSR build-time sitemap also excludes saved drafts',
      );
      const port = await availablePort();
      const origin = `http://127.0.0.1:${port}`;
      previewServer = command(['dist-ssr/server/entry.mjs'], {
        ...env,
        HOST: '127.0.0.1',
        PORT: String(port),
      });
      await ready(previewServer, origin);
      for (const [pathname, publishedMarker] of routes) {
        const response = await page.goto(`${origin}${pathname}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200, `${pathname} preview status`);
        const html = await response.text();
        assertDocument(html, pathname);
        assert.ok(
          (await page.locator('body').innerText()).includes(
            publishedMarker.replace('PUBLISHED', draftMarker),
          ),
          `${pathname} saved draft is server-rendered without JavaScript`,
        );
        if (pathname === '/blog/article-1/') {
          const inline = page.getByRole('img', { name: 'Fixture inline image' });
          const src = await inline.getAttribute('src');
          assert.match(src, /^\/_image\/?\?/, 'preview uses the same native image service on demand');
          assert.equal((await fetch(new URL(src, origin))).status, 200);
        }
        assert.match(response.headers()['cache-control'] || '', /no-store/);
        assert.match(response.headers()['x-robots-tag'] || '', /noindex/);
        assert.ok(html.includes('noindex, nofollow'));
        assert.ok(
          !/G-FIXTURE|GTM-FIXTURE|FIXTURE-PIXEL|googletagmanager\.com|facebook\.net/.test(html),
          `${pathname} suppresses tracking in preview`,
        );
      }
      cms.draft.providers.push({ documentId: 'incomplete-profile', slug: 'minimal-profile' });
      const incomplete = await fetch(`${origin}/providers/minimal-profile/`);
      assert.equal(incomplete.status, 200, 'saved drafts tolerate missing optional profile fields');
      assert.ok((await incomplete.text()).includes('<title>'));
      cms.draft.providers.pop();
      const completeHome = cms.draft['home-page'];
      cms.draft['home-page'] = { documentId: 'incomplete-home' };
      assert.equal((await fetch(origin)).status, 200, 'missing draft sections use public view defaults');
      cms.draft['home-page'] = completeHome;
      cms.unavailableResources.add('blogs');
      const unavailable = await fetch(`${origin}/blog/article-1/`);
      assert.equal(unavailable.status, 500, 'CMS failures do not masquerade as successful or missing pages');
      assert.ok(!(await unavailable.text()).includes(fixtureToken), 'CMS failure responses omit credentials');
      cms.unavailableResources.clear();
      cms.draft.blogs.push({
        ...structuredClone(cms.draft.blogs[0]),
        documentId: 'created-after-startup',
        slug: 'draft-new',
        title: `${draftMarker} Created after startup`,
        heading: `${draftMarker} Created after startup`,
      });
      assert.equal(
        (await fetch(`${origin}/blog/draft-new/`)).status,
        200,
        'new saved draft route exists without rebuilding',
      );
      cms.draft.blogs[0].heading = `${draftMarker} Edited after startup`;
      const edited = await fetch(`${origin}/blog/article-1/`);
      assert.ok(
        (await edited.text()).includes(`${draftMarker} Edited after startup`),
        'existing draft copy refreshes immediately without rebuilding',
      );
      const forcedPublished = await fetch(`${origin}/blog/article-1/?status=published`);
      assert.ok(
        (await forcedPublished.text()).includes(draftMarker),
        'browser query parameters do not override the preview deployment mode',
      );
      for (const pathname of [
        '/service-updates/2026/99/notice/',
        '/service-updates/2025/03/notice/',
        '/service-updates/invalid/notice/',
        '/blog/bad%3Fslug/',
      ]) {
        assert.equal(
          (await fetch(`${origin}${pathname}`)).status,
          404,
          `${pathname} rejects invalid path data while its source record still exists`,
        );
      }
      const families = [
        ['blogs', '/blog/', 'article-1'],
        ['conditions', '/conditions/', 'allergy'],
        ['providers', '/providers/', 'doctor-example'],
        ['clinics', '/clinics/', 'example-clinic'],
        ['service-updates', '/service-updates/2026/03/', 'notice'],
      ];
      for (const [resource, prefix, oldSlug] of families) {
        const record = cms.draft[resource][0];
        record.slug = `renamed-${oldSlug}`;
        assert.equal(
          (await fetch(`${origin}${prefix}${oldSlug}/`)).status,
          404,
          `${resource} old draft URL disappears immediately`,
        );
        const renamed = await fetch(`${origin}${prefix}${record.slug}/`);
        assert.equal(
          renamed.status,
          200,
          `${resource} renamed draft URL resolves without rebuilding`,
        );
        assert.ok((await renamed.text()).includes(draftMarker));
        cms.draft[resource].shift();
        assert.equal(
          (await fetch(`${origin}${prefix}${record.slug}/`)).status,
          404,
          `${resource} deleted draft disappears immediately`,
        );
      }
      for (const pathname of [
        '/blog/missing/',
        '/conditions/missing/',
        '/providers/missing/',
        '/clinics/missing/',
        '/service-updates/2026/99/notice/',
        '/service-updates/invalid/notice/',
        '/not-a-page/',
      ]) {
        assert.equal(
          (await fetch(`${origin}${pathname}`)).status,
          404,
          `${pathname} is a real 404`,
        );
      }
      const previewSitemap = await fetch(`${origin}/sitemap-0.xml`);
      assert.equal(previewSitemap.status, 200);
      const previewXml = await previewSitemap.text();
      assert.ok(!previewXml.includes('draft-new') && !previewXml.includes('renamed-'));
      assert.ok(
        previewXml.includes('/blog/article-1/'),
        'preview sitemap remains the published build artifact',
      );
      await assertPublicArtifacts(path.join(astroRoot, 'dist-static'));
      await stop(previewServer);
      const publishedPort = await availablePort();
      const publishedOrigin = `http://127.0.0.1:${publishedPort}`;
      previewServer = command(['dist-ssr/server/entry.mjs'], {
        ...env,
        ASTRO_CONTENT_MODE: 'published',
        HOST: '127.0.0.1',
        PORT: String(publishedPort),
      });
      await ready(previewServer, publishedOrigin);
      const publishedRequest = await fetch(
        `${publishedOrigin}/blog/article-1/?status=draft&draft=1`,
      );
      assert.equal(publishedRequest.status, 200);
      const publishedHtml = await publishedRequest.text();
      assert.ok(publishedHtml.includes('PUBLISHED BLOG_BODY_1'));
      assert.ok(
        !publishedHtml.includes(draftMarker),
        'browser input cannot unlock saved drafts on a published runtime',
      );
      assert.equal((await fetch(`${publishedOrigin}/blog/draft-new/?status=draft`)).status, 404);
    } finally {
      await browser?.close();
      await stop(staticServer);
      await stop(previewServer);
      await cms.close();
    }
  },
);
