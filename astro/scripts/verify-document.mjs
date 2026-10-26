import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { renderSitemapXml } from '../src/server/sitemap.ts';

const observedCmsRequests = [];
const cms = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  observedCmsRequests.push(url);
  response.writeHead(200, { 'content-type': 'application/json' });
  const status = url.searchParams.get('status') || 'published';
  const preview = status === 'draft';
  const pageCopy = (name) => [{ type: 'paragraph', children: [{ type: 'text', text: `${preview ? 'Preview' : 'Published'} ${name} route fixture.` }] }];
  const singleTypes = {
    '/api/announcement': { documentId: 'announcement', enabled: false, type: 'info' },
    '/api/tracking-info': { documentId: 'tracking-info', googleAnalyticsId: '', googleTagManagerId: '', pixelId: '' },
    '/api/contact': { documentId: 'contact', heading: 'Fixture Contact', metaDescription: 'Contact route metadata fixture.', text: pageCopy('contact') },
    '/api/privacy-policy': { documentId: 'privacy-policy', title: 'Fixture Privacy', description: 'Privacy route metadata fixture.', metaDescription: 'Privacy metadata.', updatedAt: '2026-01-15T12:00:00.000Z', text: pageCopy('privacy') },
  };
  if (singleTypes[url.pathname]) {
    response.end(JSON.stringify({ data: singleTypes[url.pathname] }));
    return;
  }
  if (url.pathname === '/api/clinics') {
    const name = preview ? 'Preview Clinic' : 'Published Clinic';
    response.end(JSON.stringify({
      data: [{ documentId: `${status}-clinic`, slug: name.toLowerCase().replace(' ', '-'), title: name, clinic_name: name,
        location: { address: '1 Example Street', lat: 51.5, long: -0.1 }, contact: { phone: '02000000000', fax: '' } }],
      meta: { pagination: { pageCount: 1, total: 1 } },
    }));
    return;
  }
  response.end(JSON.stringify({ data: [], meta: { pagination: { pageCount: 1, total: 0 } } }));
});
await new Promise((resolve) => cms.listen(0, '127.0.0.1', resolve));
const cmsUrl = `http://127.0.0.1:${cms.address().port}`;

async function runBuild(config) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'build', '--config', config], {
      env: { ...process.env, ASTRO_STRAPI_API_URL: cmsUrl, ASTRO_DRAFT_STRAPI_API_URL: cmsUrl },
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
  assert.ok(notFoundHtml.includes('Page Not Found!'));
  const staticPrivacy = await readFile('dist-static/privacy/index.html', 'utf8');
  assert.ok(staticPrivacy.includes('<title>Fixture Privacy | Allergy, Asthma and Sinus Centers</title>'));
  assert.ok(staticPrivacy.includes('Published privacy route fixture.'));
  assert.ok(staticPrivacy.includes('2026.01.15'));
  const staticContact = await readFile('dist-static/contact/index.html', 'utf8');
  assert.ok(staticContact.includes('<title>Fixture Contact | Allergy, Asthma and Sinus Centers</title>'));
  assert.ok(staticContact.includes('Published contact route fixture.'));
  assert.ok(staticContact.includes('Published Clinic'));
  assert.ok(staticContact.includes('name="phone"'));
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
  const portProbe = await new Promise((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
  app = spawn(process.execPath, ['dist-ssr/server/entry.mjs'], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(portProbe), ASTRO_STRAPI_API_URL: cmsUrl, ASTRO_DRAFT_STRAPI_API_URL: cmsUrl },
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
  assert.ok((await missing.text()).includes('Page Not Found!'), 'unknown SSR route uses the shared missing-page view');
  const ssrPrivacy = await fetch(`${base}/privacy/`);
  assert.equal(ssrPrivacy.status, 200);
  const ssrPrivacyHtml = await ssrPrivacy.text();
  assert.ok(ssrPrivacyHtml.includes('<title>Fixture Privacy | Allergy, Asthma and Sinus Centers</title>'));
  assert.ok(ssrPrivacyHtml.includes('Preview privacy route fixture.'));
  assert.ok(ssrPrivacyHtml.includes('2026.01.15'));
  assert.ok(ssrPrivacy.headers.get('cache-control')?.includes('no-store'));
  const ssrContact = await fetch(`${base}/contact/`);
  assert.equal(ssrContact.status, 200);
  const ssrContactHtml = await ssrContact.text();
  assert.ok(ssrContactHtml.includes('<title>Fixture Contact | Allergy, Asthma and Sinus Centers</title>'));
  assert.ok(ssrContactHtml.includes('Preview contact route fixture.'));
  assert.ok(ssrContactHtml.includes('Preview Clinic'));
  assert.ok(ssrContactHtml.includes('name="phone"'));
  assert.ok(ssrContact.headers.get('cache-control')?.includes('no-store'));

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const submissions = [];
    let attempts = 0;
    await page.route('**/contact/', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      attempts++;
      submissions.push(route.request().postDataJSON());
      await route.fulfill({
        status: attempts === 1 ? 400 : 200,
        contentType: 'application/json',
        body: attempts === 1 ? JSON.stringify({ detail: { field_errors: { phone_number: ['Fixture validation error'] } } }) : '{}',
      });
    });
    await page.goto(`${base}/contact/`);
    await page.getByLabel(/^Subject/).fill('Route verification');
    await page.getByLabel(/^Full Name/).fill('Synthetic Contact Test');
    await page.getByLabel(/^Phone Number/).fill('02000000000');
    const clinicSelect = page.locator('select[name="clinic"]');
    let clinicValue;
    if (await clinicSelect.count()) {
      clinicValue = await clinicSelect.locator('option:not([disabled])').first().getAttribute('value');
      await clinicSelect.selectOption(clinicValue);
    } else {
      clinicValue = await page.locator('input[type="hidden"][name="clinic"]').inputValue();
    }
    await page.getByLabel(/I confirm that the above message/).check();
    await page.getByRole('button', { name: 'Send Message' }).click();
    await page.getByText('Fixture validation error').waitFor({ state: 'visible' });
    assert.equal(await page.getByLabel(/^Full Name/).inputValue(), 'Synthetic Contact Test', 'field errors preserve contact form input');
    await page.getByRole('button', { name: 'Send Message' }).click();
    await page.getByText('Message successfully sent!', { exact: false }).waitFor({ state: 'visible' });
    assert.equal(attempts, 2, 'contact error can be retried without an external email request');
    assert.deepEqual(submissions.map(({ source_url, ...payload }) => payload), [
      { subject: 'Route verification', full_name: 'Synthetic Contact Test', email_address: '', phone_number: '02000000000', clinic: clinicValue, message: '', newPatient: false, disclaimer: true },
      { subject: 'Route verification', full_name: 'Synthetic Contact Test', email_address: '', phone_number: '02000000000', clinic: clinicValue, message: '', newPatient: false, disclaimer: true },
    ]);
    assert.ok(submissions.every(({ source_url }) => source_url === `${base}/contact/`));
  } finally {
    await browser.close();
  }
  const asset = await fetch(`${base}/assets/forms/patient_information.pdf`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type') || '', /pdf/);
  const beforeSitemapRequests = observedCmsRequests.length;
  const dynamicSitemap = await fetch(`${base}/sitemap.xml`);
  assert.equal(dynamicSitemap.status, 200);
  assert.match(dynamicSitemap.headers.get('content-type') || '', /application\/xml/);
  assert.ok((await dynamicSitemap.text()).includes('https://www.aascmed.com/'));
  assert.ok(observedCmsRequests.slice(beforeSitemapRequests).every((url) => url.searchParams.get('status') === 'published'), 'SSR sitemap requests published content only');
  console.log(JSON.stringify({ static: 'metadata, fixed-page content, 404, assets, headers, redirects and published sitemap verified', ssr: 'privacy/contact draft content and metadata, true 404, no-store, tracking suppression, redirect and PDF verified', contact: 'browser-submitted payload intercepted; field errors and retry verified without email', cms: 'local mock only; static fixed pages request published content and SSR fixed pages request draft content' }));
} finally {
  if (app?.exitCode === null) {
    const exited = new Promise((resolve) => app.once('exit', resolve));
    app.kill();
    await exited;
  }
  await new Promise((resolve) => cms.close(resolve));
}
