import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { canonicalPathUrl, socialImageUrl, serializeStructuredData } from '../../astro/src/server/document-metadata.ts';
import { findRedirect, parseNetlifyRedirects } from '../../astro/src/server/netlify-redirects.ts';
import { renderSitemapXml } from '../../astro/src/server/sitemap.ts';

test('canonical metadata retains the public host and route trailing slash', () => {
  assert.equal(canonicalPathUrl('/blog/example/'), 'https://www.aascmed.com/blog/example/');
  assert.equal(canonicalPathUrl('contact/'), 'https://www.aascmed.com/contact/');
  for (const path of ['//other.example/path', '/\\other.example/path', '/contact/?draft=true', '/contact/#form', '/x\n']) {
    assert.throws(() => canonicalPathUrl(path));
  }
  assert.equal(socialImageUrl('/og-images/blog/test.jpg'), 'https://www.aascmed.com/og-images/blog/test.jpg');
  assert.equal(socialImageUrl('https://cdn.example/image.jpg'), 'https://cdn.example/image.jpg');
  for (const value of ['javascript:alert(1)', 'http://example.com/image.jpg', 'https://user:password@example.com/image.jpg']) {
    assert.throws(() => socialImageUrl(value));
  }
});

test('JSON-LD remains parseable while authored tags cannot close its script', () => {
  const data = { '@type': 'MedicalClinic', name: 'Clinic </script><script>alert(1)</script>' };
  const result = serializeStructuredData(data);
  assert.equal(result.includes('<'), false);
  assert.deepEqual(JSON.parse(result), data);
});

test('real legacy redirects preserve query strings and do not loop contact', async () => {
  const rules = parseNetlifyRedirects(await readFile(new URL('../../static/_redirects', import.meta.url), 'utf8'));
  assert.deepEqual(findRedirect('/contact/index.php', rules, '?from=legacy'), { location: '/contact/?from=legacy', status: 301 });
  assert.deepEqual(findRedirect('/clinics/joliet-(crest-hill)', rules), { location: '/clinics/crest-hill/', status: 301 });
  assert.equal(findRedirect('/contact/', rules), undefined);
  assert.equal(findRedirect('/unrelated/', rules), undefined);
  const extra = parseNetlifyRedirects('/old/* /new/:splat?source=legacy 302\n/bad /target 200');
  assert.equal(extra.length, 1);
  assert.deepEqual(findRedirect('/old/path', extra, '?q=one'), { location: '/new/path?source=legacy&q=one', status: 302 });
});

test('published sitemap escapes XML, deduplicates paths and rejects host-changing values', () => {
  const xml = renderSitemapXml([{ pathname: '/blog/a&b/' }, { pathname: '/blog/a&b/' }, { pathname: '//other.example/' }, { pathname: '/\\other.example/' }]);
  assert.equal((xml.match(/a&amp;b/g) || []).length, 1);
  assert.ok(xml.includes('https://www.aascmed.com/contact/'));
  assert.ok(!xml.includes('other.example'));
});
