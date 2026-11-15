// Checks canonical metadata URLs and safe JSON-LD serialization.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalPathUrl,
  socialImageUrl,
  serializeStructuredData,
} from '../../src/server/document-metadata.ts';
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

// Exercise the real document queue and the contact success command together.
test('a contact lead queues exactly one complete Google tag command', async () => {
  const { readFileSync } = await import('node:fs');
  const { runInNewContext } = await import('node:vm');
  const document = readFileSync(new URL('../../src/layouts/SiteDocument.astro', import.meta.url), 'utf8');
  const contact = readFileSync(new URL('../../src/components/contact/index.tsx', import.meta.url), 'utf8');
  const bootstrap = document.match(/window.gtag = function \(\) \{[\s\S]*?\};/)[0];
  const commandPattern = /window.gtag\?\.\(\s*["']event["'],\s*["']generate_lead["'],\s*\{[\s\S]*?\}\s*,?\s*\);/;
  const command = contact.match(commandPattern)[0];
  assert.ok(command.replaceAll('"', "'").replace(/\}\);$/, "},\n);").match(commandPattern));
  const window = { dataLayer: [] };
  const formData = new Map([['new_patient', '1'], ['clinic', 'Aurora']]);
  runInNewContext(bootstrap + command, { window, formData });
  assert.equal(window.dataLayer.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(Array.from(window.dataLayer[0]))),
    ['event', 'generate_lead', { new_customer: true, clinic: 'Aurora' }]);
  assert.doesNotThrow(() => runInNewContext(command, { window: {}, formData }));
});
