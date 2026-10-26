import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const astroRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const harnessPath = path.join(astroRoot, '.astro', 'home-verification');
const cliPath = path.join(astroRoot, 'node_modules', 'astro', 'bin', 'astro.mjs');
const staticConfigPath = path.join(harnessPath, 'astro.config.static.mjs');
const ssrConfigPath = path.join(harnessPath, 'astro.config.ssr.mjs');
const staticOutputPath = path.join(harnessPath, 'dist-static');
const ssrOutputPath = path.join(harnessPath, 'dist-ssr');
const manifestPath = path.join(harnessPath, 'public-image-manifest.json');
const snapshotPath = path.join(harnessPath, 'published-content-snapshot.json');
const privateToken = 'verify-home-private-token';

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

for (const target of [harnessPath, staticOutputPath, ssrOutputPath]) {
  assert.equal(await exists(target), false, `Refusing to overwrite existing verification output: ${target}`);
}

function blocks(value) {
  return [{ type: 'paragraph', children: [{ type: 'text', text: value }] }];
}

function collectionData(kind, status) {
  const fixture = status === 'draft' ? 'Draft' : 'Published';
  if (kind === 'conditions') return Array.from({ length: 12 }, (_, index) => ({
    id: index + 1, documentId: `condition-doc-${index + 1}`, slug: `condition-${index + 1}`,
    title: `${fixture} condition ${index + 1}`, heading: `${fixture} condition ${index + 1}`, order: index + 1,
    thumbnail: null,
  }));
  if (kind === 'blogs') return Array.from({ length: 7 }, (_, index) => ({
    id: index + 1, documentId: `blog-doc-${index + 1}`, slug: `blog-${index + 1}`,
    title: `${fixture} blog ${index + 1}`, date: `2026-10-${String(26 - index).padStart(2, '0')}`,
    description: `${fixture} blog description ${index + 1}`,
  }));
  if (kind === 'service-updates') return Array.from({ length: 4 }, (_, index) => ({
    id: index + 1, documentId: `update-doc-${index + 1}`, slug: `update-${index + 1}`,
    title: `${fixture} update ${index + 1}`, date: `2026-10-${String(26 - index).padStart(2, '0')}`,
    description: `${fixture} update description ${index + 1}`,
  }));
  if (kind === 'providers') return [
    { id: 1, documentId: 'provider-retired', slug: 'retired-provider', title: 'Retired Provider', order: 1, name: { fullName: 'Retired Provider', honorific: 'Dr', qualificationAbbr: 'MD' }, retirementNotice: { retired: true } },
    { id: 2, documentId: 'provider-active', slug: 'active-provider', title: 'Active Provider', order: 2, name: { fullName: 'Active Provider', honorific: 'Dr', qualificationAbbr: 'MD' }, retirementNotice: { retired: false } },
  ];
  if (kind === 'reviews') return [
    { id: 1, documentId: 'review-1', name: 'Fixture reviewer', stars: 5, content: blocks(`${fixture} patient review`), sourceName: 'Fixture source', sourceUrl: 'https://reviews.example.test/' },
    { id: 2, documentId: 'review-2', name: 'Second reviewer', stars: 4, content: blocks('Second patient review'), sourceName: 'Fixture source', sourceUrl: 'https://reviews.example.test/' },
  ];
  if (kind === 'clinics') return [{
    id: 1, documentId: 'clinic-1', slug: 'fixture-clinic', title: `${fixture} Clinic`, clinic_name: `${fixture} Clinic`,
    location: { address: '1 Fixture Street', lat: 41.8, long: -87.6 }, contact: { phone: '312-555-0100', fax: '312-555-0101' },
  }];
  return [];
}

function singleData(kind, status) {
  const fixture = status === 'draft' ? 'Draft' : 'Published';
  if (kind === 'home-page') {
    const page = {
    id: 1, documentId: `home-page-private-${status}`, metaDescription: `${fixture} homepage description`,
    hero: { heading: `${fixture} homepage hero`, text: blocks(`${fixture} hero copy`), media: [] },
    genericBelowHero: [{ heading: `${fixture} welcome`, text: blocks(`${fixture} welcome copy`), media: [] }],
    conditions: { heading: `${fixture} conditions`, text: blocks('Conditions introduction'), media: [] },
    blog: { heading: `${fixture} blog`, text: blocks('Blog introduction'), media: [] },
    providers: { heading: `${fixture} providers`, text: blocks('Provider introduction'), media: [] },
    serviceUpdates: { heading: `${fixture} updates`, text: blocks('Updates introduction'), media: [] },
    feedback: { rating: 0.96, sourceName: 'Fixture source', sourceUrl: 'https://reviews.example.test/', accessDate: '26 October 2026' },
    contact: { heading: `${fixture} contact`, text: blocks('Contact our clinic'), media: [] },
    locations: { heading: `${fixture} locations`, text: blocks('Find a nearby clinic'), media: [] },
    };
    if (status === 'draft' && omitOptionalDraftSections) {
      for (const key of ['genericBelowHero', 'conditions', 'blog', 'providers', 'serviceUpdates', 'feedback', 'contact', 'locations']) delete page[key];
    }
    return page;
  }
  if (kind === 'announcement') return { id: 2, documentId: 'announcement', enabled: false };
  if (kind === 'tracking-info') return { id: 3, documentId: 'tracking', googleAnalyticsId: '', googleTagManagerId: '', pixelId: '' };
  return null;
}

const requests = [];
let omitOptionalDraftSections = false;
const activeByStatus = new Map();
const maximumByStatus = new Map();
let api = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  const kind = url.pathname.split('/').filter(Boolean).at(-1);
  const status = url.searchParams.get('status');
  const active = (activeByStatus.get(status) || 0) + 1;
  activeByStatus.set(status, active);
  maximumByStatus.set(status, Math.max(maximumByStatus.get(status) || 0, active));
  requests.push({ kind, status, authorization: request.headers.authorization });
  await new Promise((resolve) => setTimeout(resolve, 20));
  const collectionKinds = new Set(['blogs', 'clinics', 'conditions', 'providers', 'service-updates', 'reviews']);
  const data = collectionKinds.has(kind) ? collectionData(kind, status) : singleData(kind, status);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(collectionKinds.has(kind)
    ? { data, meta: { pagination: { pageCount: 1, total: data.length } } }
    : { data }));
  activeByStatus.set(status, activeByStatus.get(status) - 1);
});

await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve));
const apiPort = api.address().port;
const apiUrl = `http://127.0.0.1:${apiPort}/api`;
let app;
let browser;

try {
  await mkdir(harnessPath, { recursive: true });
  await writeFile(staticConfigPath, `
import base from '../../astro.config.static.mjs';
import { publicImagesIntegration } from '../../src/integrations/public-images.ts';
import path from 'node:path';
const integration = publicImagesIntegration({
  loadPublishedCollections: async () => {
    const { getPublishedBuildSnapshot } = await import('../../src/server/content/loaders.ts');
    return getPublishedBuildSnapshot({ staticBuild: true });
  },
  stagingDir: path.resolve('.astro/home-verification/public-images'),
  cacheDir: path.resolve('.astro/home-verification/image-cache'),
  manifestPath: path.resolve('.astro/home-verification/public-image-manifest.json'),
});
export default { ...base, outDir: '.astro/home-verification/dist-static', integrations: [...base.integrations.filter((item) => item.name !== 'aasc-public-images'), integration] };
`, 'utf8');
  await writeFile(ssrConfigPath, `
import base from '../../astro.config.ssr.mjs';
export default { ...base, outDir: '.astro/home-verification/dist-ssr' };
`, 'utf8');

  const run = (config, extraEnv = {}) => new Promise((resolve, reject) => {
    const child = spawn(globalThis.process.execPath, [cliPath, 'build', '--config', path.relative(astroRoot, config)], {
      cwd: astroRoot, stdio: 'inherit', env: { ...globalThis.process.env, ...extraEnv },
    });
    child.once('error', reject);
    child.once('close', resolve);
  });

  assert.equal(await run(staticConfigPath, {
    ASTRO_STRAPI_API_URL: apiUrl,
    ASTRO_PUBLISHED_CONTENT_SNAPSHOT_PATH: snapshotPath,
    ASTRO_PUBLIC_IMAGE_MANIFEST_PATH: manifestPath,
  }), 0, 'fixture-backed published Astro build succeeds');
  const staticHtml = await readFile(path.join(staticOutputPath, 'index.html'), 'utf8');
  for (const expected of [
    'Published homepage hero', 'Published hero copy', 'Published welcome copy',
    'Published condition 1', 'Published condition 11', 'Published blog 6', 'Published update 3',
    'Active Provider', 'Patient Feedback', 'Published contact', 'Published locations',
    '312-555-0100', 'Book online', '/assets/hero-bg.png',
  ]) assert.ok(staticHtml.includes(expected), `static home contains ${expected}`);
  for (const excluded of ['Published condition 12', 'Published blog 7', 'Published update 4', 'Retired Provider', 'home-page-private-published', privateToken]) {
    assert.equal(staticHtml.includes(excluded), false, `static output excludes ${excluded}`);
  }
  assert.equal(requests.filter(({ status }) => status === 'published').every(({ status }) => status === 'published'), true);
  for (const kind of ['blogs', 'clinics', 'conditions', 'providers', 'service-updates', 'reviews']) {
    assert.equal(requests.filter((request) => request.kind === kind && request.status === 'published').length, 1, `published ${kind} collection is fetched once`);
  }
  assert.ok(maximumByStatus.get('published') <= 4, `static collection concurrency is bounded (${maximumByStatus.get('published')})`);
  assert.equal(requests.filter(({ status }) => status === 'draft').length, 0, 'published static build never requests draft content');

  assert.equal(await run(ssrConfigPath), 0, 'compiled Node SSR Astro build succeeds');
  const portProbe = createServer();
  await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
  const appPort = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  app = spawn(process.execPath, [path.join(ssrOutputPath, 'server', 'entry.mjs')], {
    cwd: astroRoot, stdio: 'ignore',
    env: { ...globalThis.process.env, HOST: '127.0.0.1', PORT: String(appPort), ASTRO_DRAFT_STRAPI_API_URL: apiUrl, ASTRO_STRAPI_TOKEN: privateToken },
  });
  const baseUrl = `http://127.0.0.1:${appPort}/`;
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    try { ready = (await fetch(baseUrl)).ok; } catch { /* server starting */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, 'compiled SSR homepage responds');
  const ssrResponse = await fetch(baseUrl);
  const ssrHtml = await ssrResponse.text();
  assert.equal(ssrResponse.headers.get('cache-control'), 'private, no-store');
  for (const expected of ['Draft homepage hero', 'Draft hero copy', 'Draft condition 11', 'Draft blog 6', 'Draft update 3', 'Active Provider', 'Draft contact', 'Draft locations', 'Book online']) {
    assert.ok(ssrHtml.includes(expected), `SSR home contains ${expected}`);
  }
  for (const excluded of ['Draft condition 12', 'Draft blog 7', 'Draft update 4', 'Retired Provider', 'home-page-private-draft', privateToken]) {
    assert.equal(ssrHtml.includes(excluded), false, `SSR output excludes ${excluded}`);
  }
  const draftRequests = requests.filter(({ status }) => status === 'draft');
  assert.ok(draftRequests.length > 0 && draftRequests.every(({ authorization }) => authorization === `Bearer ${privateToken}`), 'draft token is sent only to server-side Strapi requests');
  assert.ok(maximumByStatus.get('draft') <= 3, `draft collection concurrency is bounded (${maximumByStatus.get('draft')})`);

  omitOptionalDraftSections = true;
  const incompleteDraft = await (await fetch(baseUrl)).text();
  for (const fallback of ['Draft homepage hero', 'Learn more about the conditions we treat.', 'Contact Us', 'Practices']) {
    assert.ok(incompleteDraft.includes(fallback), `incomplete draft keeps the homepage usable with ${fallback}`);
  }
  assert.equal(incompleteDraft.includes('Draft welcome copy'), false, 'an omitted draft section does not render stale content');
  assert.equal(incompleteDraft.includes(privateToken), false, 'incomplete-draft HTML does not expose the CMS token');

  browser = await chromium.launch();
  for (const viewport of [{ width: 390, height: 844, name: 'mobile' }, { width: 1440, height: 1000, name: 'desktop' }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.getByText('Draft homepage hero').count(), 1);
    assert.equal(await page.getByText('Draft condition 11').count(), 1);
    const geometry = await page.locator('header').first().evaluate((header) => ({
      width: header.getBoundingClientRect().width,
      height: header.getBoundingClientRect().height,
      headingVisible: getComputedStyle(header.querySelector('h2')).display !== 'none',
      styleTags: document.querySelectorAll('style[data-emotion]').length,
    }));
    assert.ok(geometry.width > 0 && geometry.height > 0 && geometry.headingVisible && geometry.styleTags > 0, `${viewport.name} first paint has visible styled hero: ${JSON.stringify(geometry)}`);
    await context.close();
  }
  console.log('Astro homepage checks passed: published and draft data, section limits/order, retiree filtering, server-only CMS credentials, bounded concurrency, SSR cache headers, and styled desktop/mobile no-JS first paint.');
} finally {
  await browser?.close();
  if (app?.exitCode === null) {
    const exited = new Promise((resolve) => app.once('exit', resolve));
    app.kill();
    await exited;
  }
  await new Promise((resolve) => api.close(resolve));
  await rm(harnessPath, { recursive: true, force: true });
}
