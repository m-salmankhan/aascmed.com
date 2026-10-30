import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, chmod, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { renderTunnelConfig } from '../../preview-server/render-tunnel-config.mjs';

test('tunnel preflight fails closed and writes only an Access-protected ingress', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'preview-tunnel-'));
  const id = '12345678-1234-1234-1234-123456789abc';
  const credentials = path.join(dir, 'credentials.json');
  const output = path.join(dir, 'config.json');
  const env = { PREVIEW_FRAME_ORIGINS: 'https://cms.acme.test https://editor.acme.test:8443', PREVIEW_IMAGE: `ghcr.io/test/preview@sha256:${'c'.repeat(64)}`, PREVIEW_DOMAIN: 'preview.acme.test', CLOUDFLARE_ACCOUNT_ID: 'b'.repeat(32), CLOUDFLARE_TEAM_NAME: 'test-team', CLOUDFLARE_ACCESS_AUD: 'a'.repeat(64), CLOUDFLARE_TUNNEL_ID: id, TUNNEL_CREDENTIALS_FILE: credentials, TUNNEL_CONFIG_FILE: output };
  try {
    await writeFile(credentials, JSON.stringify({ TunnelID: id, AccountTag: 'b'.repeat(32), TunnelSecret: Buffer.alloc(32, 1).toString('base64') }), { mode: 0o600 });
    const config = await renderTunnelConfig(env);
    assert.equal(config.ingress[0].originRequest.access.required, true);
    assert.deepEqual(config.ingress[0].originRequest.access.audTag, [env.CLOUDFLARE_ACCESS_AUD]);
    assert.equal(config.ingress[0].service, 'http://preview-caddy:8080');
    assert.equal(config.ingress[1].service, 'http_status:404');
    assert.doesNotMatch(await readFile(output, 'utf8'), /TunnelSecret/);
    for (const key of ['PREVIEW_FRAME_ORIGINS', 'PREVIEW_IMAGE', 'PREVIEW_DOMAIN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_TEAM_NAME', 'CLOUDFLARE_ACCESS_AUD', 'CLOUDFLARE_TUNNEL_ID', 'TUNNEL_CREDENTIALS_FILE', 'TUNNEL_CONFIG_FILE']) {
      await assert.rejects(renderTunnelConfig({ ...env, [key]: '' }));
    }
    for (const origin of ['https://*.acme.test', 'https://cms.acme.test/path', 'http://cms.acme.test', 'https://cms.acme.test;foo', 'https://cms.acme.test\nhttps://evil.test']) await assert.rejects(renderTunnelConfig({ ...env, PREVIEW_FRAME_ORIGINS: origin }));
    await assert.rejects(renderTunnelConfig({ ...env, PREVIEW_IMAGE: 'ghcr.io/test/preview:latest' }));
    await assert.rejects(renderTunnelConfig({ ...env, PREVIEW_DOMAIN: 'x.test\n  - service: http://evil' }));
    await assert.rejects(renderTunnelConfig({ ...env, CLOUDFLARE_TUNNEL_ID: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }));
    await assert.rejects(renderTunnelConfig({ ...env, CLOUDFLARE_ACCOUNT_ID: 'd'.repeat(32) }));
    await chmod(credentials, 0o644);
    await assert.rejects(renderTunnelConfig(env));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
