// Converts fixed and published content routes into the public sitemap XML.
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

/** Escape text before placing a canonical URL inside an XML element.
 * @param value Unescaped URL text.
 * @returns Text with XML-sensitive characters replaced by entity references.
 */
function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character]!);
}

/** Build a deterministic sitemap from fixed pages and published content routes.
 * @param routes Published detail-route pathnames; external URLs and invalid paths are excluded.
 * @param canonicalOrigin Public website origin used to turn route paths into absolute URLs.
 * @returns XML URL set with escaped, sorted, deduplicated canonical URLs, including fixed pages.
 */
export function renderSitemapXml(
  routes: SitemapRoute[],
  canonicalOrigin = 'https://www.aascmed.com',
) {
  const origin = canonicalOrigin.replace(/\/+$/, '');
  const paths = [...new Set([...fixedPublicRoutes, ...routes.map(({ pathname }) => pathname)])]
    .filter((pathname) => pathname.startsWith('/') && !pathname.startsWith('//') && !/[\\?#\u0000-\u0020]/.test(pathname))
    .sort();
  const urls = paths.map((pathname) => `  <url><loc>${escapeXml(new URL(pathname, `${origin}/`).href)}</loc></url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}
