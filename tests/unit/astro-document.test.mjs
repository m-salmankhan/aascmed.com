// Checks canonical metadata URLs and safe JSON-LD serialization.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalPathUrl,
  socialImageUrl,
  serializeStructuredData,
} from '../../astro/src/server/document-metadata.ts';
test('canonical metadata retains the public host and route trailing slash', () => {
  assert.equal(canonicalPathUrl('/blog/example/'), 'https://www.aascmed.com/blog/example/');
  assert.equal(canonicalPathUrl('contact/'), 'https://www.aascmed.com/contact/');
  for (const path of [
    '//other.example/path',
    '/\\other.example/path',
    '/contact/?draft=true',
    '/contact/#form',
    '/x\n',
  ]) {
    assert.throws(() => canonicalPathUrl(path));
  }
  assert.equal(
    socialImageUrl('/og-images/blog/test.jpg'),
    'https://www.aascmed.com/og-images/blog/test.jpg',
  );
  assert.equal(socialImageUrl('https://cdn.example/image.jpg'), 'https://cdn.example/image.jpg');
  assert.equal(socialImageUrl('http://127.0.0.1:4321/image.jpg'), 'http://127.0.0.1:4321/image.jpg');
  for (const value of [
    'javascript:alert(1)',
    'http://example.com/image.jpg',
    'https://user:password@example.com/image.jpg',
  ]) {
    assert.throws(() => socialImageUrl(value));
  }
});
test('JSON-LD remains parseable while authored tags cannot close its script', () => {
  const data = { '@type': 'MedicalClinic', name: 'Clinic </script><script>alert(1)</script>' };
  const result = serializeStructuredData(data);
  assert.equal(result.includes('<'), false);
  assert.deepEqual(JSON.parse(result), data);
});
