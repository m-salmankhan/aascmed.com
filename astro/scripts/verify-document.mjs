import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { renderSitemapXml } from '../src/server/sitemap.ts';

const staticHtml = await readFile('dist-static/index.html', 'utf8');
for (const expected of [
  '<title>Astro architecture proof | Allergy, Asthma and Sinus Centers</title>',
  'href="https://www.aascmed.com/"',
  'property="og:title"',
  'type="application/ld+json"',
  '"@type":"WebPage"',
  'name="twitter:card"',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&amp;display=swap',
]) assert.ok(staticHtml.includes(expected), `static HTML missing ${expected}`);
assert.ok(!staticHtml.includes('name="robots"'), 'public static page must remain indexable');
for (const asset of [
  'assets/favicon/favicon.svg',
  'assets/favicon/favicon-32x32.png',
  'assets/forms/patient_information.pdf',
  'assets/forms/financial_policy.pdf',
  '_redirects',
  '_headers',
]) await stat(`dist-static/${asset}`);

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

const portProbe = await import('node:net').then(({ createServer }) => new Promise((resolve) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
}));
const app = spawn(process.execPath, ['dist-ssr/server/entry.mjs'], {
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(portProbe) },
  stdio: 'ignore',
});
try {
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
  assert.ok(!ssrHtml.includes('googletagmanager.com') && !ssrHtml.includes('connect.facebook.net'), 'preview omits tracking');

  const legacy = await fetch(`${base}/contact/index.php`, { redirect: 'manual' });
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get('location'), '/contact/');
  const asset = await fetch(`${base}/assets/forms/patient_information.pdf`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('content-type') || '', /pdf/);
  console.log(JSON.stringify({ staticDocument: 'metadata and assets verified', sitemap: 'published manifest input and fixed routes verified', ssr: 'noindex, no-store, tracking suppressed', redirects: 'legacy contact wildcard returns 301', pdf: 'SSR asset path served' }));
} finally {
  app.kill();
}
