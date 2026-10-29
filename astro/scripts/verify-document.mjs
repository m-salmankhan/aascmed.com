import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, writeFile, unlink } from 'node:fs/promises';
import { renderSitemapXml } from '../src/server/sitemap.ts';
import { chromium } from '@playwright/test';

const observedCmsRequests = [];
const cms = createServer((request, response) => {
  observedCmsRequests.push(new URL(request.url, 'http://localhost'));
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ data: [], meta: { pagination: { pageCount: 1, total: 0 } } }));
});
await new Promise((resolve) => cms.listen(0, '127.0.0.1', resolve));
const cmsUrl = `http://127.0.0.1:${cms.address().port}`;

/** Build one Astro target against the verifier's local CMS fixture.
 * @param config Static or SSR Astro configuration filename, relative to the Astro package.
 * @returns A promise that resolves when the child build succeeds; rejects on spawn or build failure.
 */
async function runBuild(config) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build', '--config', config], {
      env: { ...process.env, GATSBY_STRAPI_API_URL: cmsUrl },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${config} failed with exit ${code}`)));
  });
}

let app;
const fixturePath = new URL('../src/pages/verification-document-fixture.astro', import.meta.url);
let fixtureCreated = false;
try {
  await writeFile(fixturePath, `---
import SiteDocument from '../layouts/SiteDocument.astro';
---
<SiteDocument title="Metadata fixture" description="Fixture description" pathname="/verification-document-fixture/"
  useTracking={true} trackingSettings={{ googleAnalyticsId: 'G-TEST', googleTagManagerId: 'GTM-TEST', pixelId: 'TEST-PIXEL' }}
  socialImagePath="/og-images/fixture.jpg" structuredData={{ '@type': 'MedicalClinic', name: '</script><script>untrusted</script>' }}>
  <main>Document fixture</main>
</SiteDocument>`, { flag: 'wx' });
  fixtureCreated = true;
  await runBuild('astro.config.static.mjs');
  assert.ok(observedCmsRequests.length >= 5, 'static sitemap loads its published route collections');
  assert.ok(observedCmsRequests.every((url) => url.searchParams.get('status') === 'published'), 'static build requests published content only');

  const staticHtml = await readFile('dist-static/index.html', 'utf8');
  for (const expected of [
    '<title>Astro architecture proof | Allergy, Asthma and Sinus Centers</title>',
    'href="https://www.aascmed.com/"',
    'property="og:title"',
    'type="application/ld+json"',
    '"@type":"WebPage"',
    'name="twitter:card"',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&display=swap',
  ]) assert.ok(staticHtml.includes(expected), `static HTML missing ${expected}`);
  assert.ok(!staticHtml.includes('name="robots"'), 'public static page must remain indexable');
  const fixtureHtml = await readFile('dist-static/verification-document-fixture/index.html', 'utf8');
  assert.ok(fixtureHtml.includes('gtag/js?id=G-TEST') && fixtureHtml.includes('GTM-TEST') && fixtureHtml.includes('TEST-PIXEL'), 'public tracking is rendered when explicitly enabled');
  assert.ok(fixtureHtml.includes("window.gtag('consent', 'default'"), 'existing consent initialization is preserved');
  assert.ok(fixtureHtml.includes('summary_large_image') && fixtureHtml.includes('https://www.aascmed.com/og-images/fixture.jpg'));
  assert.ok(!fixtureHtml.includes('<script>untrusted</script>'), 'authored JSON-LD cannot create executable markup');
  const fixtureJson = fixtureHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.equal(JSON.parse(fixtureJson).name, '</script><script>untrusted</script>');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    // Run real inline tracking code, but intercept every external request.
    await context.route('**/*', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(fixtureHtml, { waitUntil: 'load' });
    const tracking = await page.evaluate(() => ({
      tagManager: window.dataLayer.some(item => item['gtm.start']),
      pixel: window.fbq.queue.map(item => [...item]),
    }));
    assert.ok(tracking.tagManager, 'GTM initialization executes');
    assert.deepEqual(tracking.pixel, [['init', 'TEST-PIXEL'], ['track', 'PageView']]);
    assert.deepEqual(errors, [], 'enabled tracking scripts execute together without lexical collisions');
  } finally { await browser.close(); }
  const notFoundHtml = await readFile('dist-static/404.html', 'utf8');
  assert.ok(notFoundHtml.includes('name="robots" content="noindex, nofollow"'));
  assert.ok(notFoundHtml.includes('<h1>Page not found</h1>'));
  for (const asset of [
    'assets/favicon/favicon.svg',
    'assets/favicon/favicon-32x32.png',
    'assets/forms/patient_information.pdf',
    'assets/forms/financial_policy.pdf',
    '404.html',
    '_redirects',
    '_headers',
    'sitemap.xml',
    'sitemap-index.xml',
    'sitemap-0.xml',
  ]) await stat(`dist-static/${asset}`);
  const staticSitemap = await readFile('dist-static/sitemap.xml', 'utf8');
  assert.ok(staticSitemap.includes('https://www.aascmed.com/'));
  const indexXml = await readFile('dist-static/sitemap-index.xml', 'utf8');
  assert.ok(indexXml.includes('<sitemapindex') && indexXml.includes('https://www.aascmed.com/sitemap.xml'));

  const sitemap = renderSitemapXml([
    { pathname: '/clinics/published-clinic/' },
    { pathname: '/blog/a&b/' },
    { pathname: '/clinics/published-clinic/' },
    { pathname: 'https://draft.example/private/' },
  ]);
  assert.ok(sitemap.includes('https://www.aascmed.com/clinics/published-clinic/'));
  assert.ok(sitemap.includes('/blog/a&amp;b/'));
  assert.equal((sitemap.match(/published-clinic/g) || []).length, 1, 'sitemap routes are deduplicated');
  assert.ok(!sitemap.includes('draft.example'), 'sitemap ignores non-path manifest values');

  await runBuild('astro.config.ssr.mjs');
  const beforeSsrRequests = observedCmsRequests.length;
  const portProbe = await new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
  app = spawn(process.execPath, ['dist-ssr/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(portProbe), GATSBY_STRAPI_API_URL: cmsUrl },
    stdio: 'ignore',
  });
  const base = `http://127.0.0.1:${portProbe}`;
  let response;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      response = await fetch(base, { redirect: 'manual' });
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  assert.ok(response, 'SSR app starts');
  const ssrHtml = await response.text();
  assert.ok(ssrHtml.includes('name="robots" content="noindex, nofollow"'));
  assert.ok(response.headers.get('x-robots-tag')?.includes('noindex'));
  assert.ok(response.headers.get('cache-control')?.includes('no-store'));
  assert.ok(response.headers.get('content-security-policy')?.includes('frame-ancestors'));
  assert.ok(!ssrHtml.includes('googletagmanager.com') && !ssrHtml.includes('connect.facebook.net'), 'preview omits tracking');
  const previewFixture = await fetch(`${base}/verification-document-fixture/`);
  assert.equal(previewFixture.status, 200);
  const previewFixtureHtml = await previewFixture.text();
  assert.ok(!/G-TEST|GTM-TEST|TEST-PIXEL|googletagmanager\.com|facebook\.net/.test(previewFixtureHtml), 'preview suppresses tracking even when the route enables it');
  assert.ok(previewFixtureHtml.includes('name="robots" content="noindex, nofollow"'));
  assert.ok(ssrHtml.includes('type="application/ld+json"') && ssrHtml.indexOf('application/ld+json') < ssrHtml.indexOf('<astro-island'), 'head metadata is emitted before hydration');

  const legacy = await fetch(`${base}/contact/index.php?source=legacy`, { redirect: 'manual' });
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get('location'), '/contact/?source=legacy');
  const missing = await fetch(`${base}/unknown-public-route/`);
  assert.equal(missing.status, 404);
  const asset = await fetch(`${base}/assets/forms/patient_information.pdf`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type') || '', /pdf/);
  const dynamicSitemap = await fetch(`${base}/sitemap.xml`);
  assert.equal(dynamicSitemap.status, 200);
  assert.match(dynamicSitemap.headers.get('content-type') || '', /application\/xml/);
  assert.ok((await dynamicSitemap.text()).includes('https://www.aascmed.com/'));
  for (const path of ['/sitemap-index.xml', '/sitemap-0.xml']) {
    const sitemapResponse = await fetch(`${base}${path}`);
    assert.equal(sitemapResponse.status, 200, `${path} remains reachable`);
    assert.match(sitemapResponse.headers.get('content-type') || '', /application\/xml/);
  }
  assert.ok(observedCmsRequests.slice(beforeSsrRequests).every((url) => url.searchParams.get('status') === 'published'), 'SSR sitemap requests published content only');
  console.log(JSON.stringify({ static: 'metadata, JSON-LD, assets, headers, redirects and published sitemap verified', ssr: 'noindex, no-store, tracking suppressed, metadata before hydration, redirect and PDF verified', cms: 'local mock only; all manifest requests use published status' }));
} finally {
  if (app?.exitCode === null && app.signalCode === null) {
    const exited = new Promise((resolve) => app.once('exit', resolve));
    app.kill();
    await exited;
  }
  await new Promise((resolve) => cms.close(resolve));
  if (fixtureCreated) await unlink(fixturePath);
}
