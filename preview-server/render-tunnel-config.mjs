// Render a locally managed tunnel with mandatory Access validation.
import { readFile, stat, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export async function renderTunnelConfig(env) {
  const { PREVIEW_DOMAIN: host, CLOUDFLARE_TEAM_NAME: team, CLOUDFLARE_ACCESS_AUD: aud,
    CLOUDFLARE_TUNNEL_ID: tunnel, CLOUDFLARE_ACCOUNT_ID: account, TUNNEL_CREDENTIALS_FILE: credentialPath,
    TUNNEL_CONFIG_FILE: configPath, PREVIEW_IMAGE: image } = env;
  if (!image || !/^[a-z0-9][a-z0-9./_-]*@sha256:[a-f0-9]{64}$/.test(image)) throw new Error('Set the reviewed preview image digest');
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!host || host.length > 253 || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host) || host === 'preview.example.com') throw new Error('Set the real preview hostname');
  if (!team || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(team)) throw new Error('Set the Cloudflare team name');
  if (!aud || !/^[a-f0-9]{64}$/i.test(aud)) throw new Error('Set the Access application audience tag');
  if (!account || !/^[a-f0-9]{32}$/i.test(account)) throw new Error('Set the Cloudflare account ID');
  if (!tunnel || !uuid.test(tunnel)) throw new Error('Set the tunnel UUID');
  if (!credentialPath || !configPath || !path.isAbsolute(credentialPath) || !path.isAbsolute(configPath) || credentialPath === configPath) throw new Error('Set distinct absolute credential and config paths');
  const info = await stat(credentialPath);
  if (!info.isFile() || (info.mode & 0o077) !== 0) throw new Error('Tunnel credentials must be a private regular file (mode 600)');
  const creds = JSON.parse(await readFile(credentialPath, 'utf8'));
  if (creds.TunnelID?.toLowerCase() !== tunnel.toLowerCase() || typeof creds.AccountTag !== 'string' || creds.AccountTag.toLowerCase() !== account.toLowerCase() || typeof creds.TunnelSecret !== 'string' || Buffer.from(creds.TunnelSecret, 'base64').length !== 32) throw new Error('Tunnel credentials do not match the tunnel UUID');
  // JSON is also valid YAML, avoiding interpolation or YAML injection.
  const config = {
    tunnel,
    'credentials-file': '/etc/cloudflared/credentials.json',
    ingress: [
      { hostname: host, service: 'http://preview-caddy:8080', originRequest: { access: { required: true, teamName: team, audTag: [aud] } } },
      { service: 'http_status:404' },
    ],
  };
  const temp = `${configPath}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await rename(temp, configPath);
  } finally {
    await unlink(temp).catch(() => {});
  }
  return config;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  renderTunnelConfig(process.env).then(() => console.log('Tunnel configuration prepared. Validate ingress before starting.')).catch(() => {
    console.error('Tunnel preflight failed: check image, hostname, account, team, audience, tunnel ID and private credentials file.');
    process.exitCode = 1;
  });
}
