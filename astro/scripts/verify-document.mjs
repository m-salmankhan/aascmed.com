import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { renderSitemapXml } from '../src/server/sitemap.ts';

const observedCmsRequests = [];
const cms = createServer((request, response) => {
  observedCmsRequests.push(new URL(request.url, 'http://localhost'));
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ data: [], meta: { pagination: { pageCount: 1, total: 0 } } }));
});
await new Promise((resolve) => cms.listen(0, '127.0.0.1', resolve));
const cmsUrl = `http://127.0.0.1:${cms.address().port}`;

async function runBuild(config) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build', '--config', config], {
      env: { ...process.env, ASTRO_STRAPI_API_URL: cmsUrl },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${config} failed with exit ${code}`)));
  });
}

let app;
try {
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
  ]) await stat(`dist-static/${asset}`);
  const staticSitemap = await readFile('dist-static/sitemap.xml', 'utf8');
  assert.ok(staticSitemap.includes('https://www.aascmed.com/'));

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
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(portProbe), ASTRO_STRAPI_API_URL: cmsUrl },
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
  assert.ok(observedCmsRequests.slice(beforeSsrRequests).every((url) => url.searchParams.get('status') === 'published'), 'SSR sitemap requests published content only');
  console.log(JSON.stringify({ static: 'metadata, JSON-LD, assets, headers, redirects and published sitemap verified', ssr: 'noindex, no-store, tracking suppressed, metadata before hydration, redirect and PDF verified', cms: 'local mock only; all manifest requests use published status' }));
} finally {
  if (app?.exitCode === null) {
    const exited = new Promise((resolve) => app.once('exit', resolve));
    app.kill();
    await exited;
  }
  await new Promise((resolve) => cms.close(resolve));
}
