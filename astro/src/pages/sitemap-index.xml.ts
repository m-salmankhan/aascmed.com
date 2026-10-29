import { canonicalOrigin } from '../server/document-metadata';

/** Preserve Gatsby's sitemap index URL for existing crawlers.
 * @returns XML index response pointing to the public Astro sitemap on the canonical host.
 */
export function GET() {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${canonicalOrigin}/sitemap.xml</loc></sitemap></sitemapindex>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
