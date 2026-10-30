// Defines remote media origins shared by Astro image processing and social-card downloads.
/** Protocol-aware media origin accepted for public image processing. */
export interface PublicMediaHost {
  protocol: 'http' | 'https';
  hostname: string;
  port?: string;
}

/** Read Strapi and CDN origins once so Astro and social-card reads use the same host allowlist.
 * @returns Unique protocol-aware origins accepted for public image processing.
 */
export function getPublicMediaHosts(): PublicMediaHost[] {
  const hosts = new Map<string, PublicMediaHost>();
  /** Add a validated origin to the shared remote-media list.
   * @param url Absolute HTTP(S) URL from CMS or CDN configuration.
   * @returns Nothing; the origin is stored once by protocol, hostname and port.
   */
  function addHost(url: URL): void {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error('Public media URLs must use HTTP or HTTPS');
    }
    if (url.protocol === 'http:' && !isLoopback(url.hostname)) {
      throw new Error(
        'HTTP public media URLs are allowed only on loopback hosts',
      );
    }
    const host = {
      protocol: url.protocol.slice(0, -1) as PublicMediaHost['protocol'],
      hostname: url.hostname.toLowerCase(),
      ...(url.port ? { port: url.port } : {}),
    };
    hosts.set(`${host.protocol}//${host.hostname}:${host.port || ''}`, host);
  }

  addHost(new URL('https://wise-positivity-21c2bd6b3f.media.strapiapp.com'));
  const strapiUrl = process.env.GATSBY_STRAPI_API_URL;
  if (strapiUrl) {
    try {
      addHost(new URL(strapiUrl));
    } catch {
      throw new Error('GATSBY_STRAPI_API_URL must be an absolute HTTP(S) URL');
    }
  }
  for (const rawHost of (process.env.STRAPI_MEDIA_HOSTS || '').split(',')) {
    const hostname = rawHost.trim().toLowerCase();
    if (!hostname) {
      continue;
    }
    let parsed: URL;
    try {
      parsed = new URL(`https://${hostname}`);
    } catch {
      throw new Error(
        'STRAPI_MEDIA_HOSTS must contain hostnames without schemes or ports',
      );
    }
    if (
      parsed.hostname !== hostname ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        'STRAPI_MEDIA_HOSTS must contain hostnames without schemes or ports',
      );
    }
    addHost(parsed);
  }
  return [...hosts.values()];
}

/** Check whether an HTTP hostname is a loopback address for local development fixtures.
 * @param hostname Parsed URL hostname.
 * @returns True only for localhost or IPv4/IPv6 loopback literals.
 */
function isLoopback(hostname: string): boolean {
  return (
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  );
}
