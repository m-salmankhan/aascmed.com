export interface SitemapRoute {
  pathname: string;
}

export const fixedPublicRoutes = [
  '/',
  '/blog/',
  '/clinics/',
  '/conditions/',
  '/providers/',
  '/service-updates/',
  '/contact/',
  '/privacy/',
] as const;

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]!);
}

/** Build a deterministic sitemap from public fixed routes and a published-only manifest. */
export function renderSitemapXml(
  routes: SitemapRoute[],
  canonicalOrigin = 'https://www.aascmed.com',
) {
  const origin = canonicalOrigin.replace(/\/+$/, '');
  const paths = [...new Set([...fixedPublicRoutes, ...routes.map(({ pathname }) => pathname)])]
    .filter((pathname) => pathname.startsWith('/') && !pathname.startsWith('//'))
    .sort();
  const urls = paths.map((pathname) => `  <url><loc>${escapeXml(new URL(pathname, `${origin}/`).href)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
