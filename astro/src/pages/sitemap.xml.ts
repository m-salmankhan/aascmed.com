import { getPublishedRouteManifest } from '../server/content/routes';
import { renderSitemapXml } from '../server/sitemap';

/** Serve the public route inventory in both static output and compiled SSR.
 * @returns XML response built exclusively from published records, even on draft-preview deployments.
 */
export async function GET() {
  const routes = await getPublishedRouteManifest();
  return new Response(renderSitemapXml(routes), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
