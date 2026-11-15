import assert from 'node:assert/strict';
import test from 'node:test';
import { startFixtureCms, fixtureToken } from '../fixtures/astro-cms/server.mjs';
import { availablePort, command, ready, stop } from '../fixtures/astro-cms/process.mjs';

test('Astro dev reads changed announcement and tracking settings without a restart', { timeout: 120000 }, async () => {
  const cms = await startFixtureCms();
  let server;
  try {
    const port = await availablePort();
    const origin = `http://127.0.0.1:${port}`;
    server = command(['node_modules/astro/bin/astro.mjs', 'dev', '--host', '127.0.0.1', '--port', String(port)], {
      ...process.env, STRAPI_API_URL: cms.origin, STRAPI_TOKEN: fixtureToken,
      STRAPI_MEDIA_ORIGINS: cms.origin, ASTRO_CONTENT_MODE: 'published', PUBLIC_MAPBOX_API_KEY: '',
    });
    await ready(server, `${origin}/privacy/`);
    const before = await (await fetch(`${origin}/privacy/`)).text();
    assert.ok(before.includes('PUBLISHED ANNOUNCEMENT'));
    cms.published.announcement.message = [{ type: 'paragraph', children: [{ type: 'text', text: 'UPDATED DEV ANNOUNCEMENT' }] }];
    cms.published['tracking-info'].googleAnalyticsId = 'G-DEV-UPDATED';
    const after = await (await fetch(`${origin}/privacy/`)).text();
    assert.ok(after.includes('UPDATED DEV ANNOUNCEMENT'));
    assert.ok(after.includes('G-DEV-UPDATED'));
    assert.ok(!after.includes('PUBLISHED ANNOUNCEMENT'));
  } finally {
    await stop(server);
    await cms.close();
  }
});
