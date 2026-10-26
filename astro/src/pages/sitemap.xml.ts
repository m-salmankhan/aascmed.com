import { getPublishedRouteManifest } from '../server/content/routes';
import { renderSitemapXml } from '../server/sitemap';

export async function GET() {
  const routes = await getPublishedRouteManifest();
  return new Response(renderSitemapXml(routes), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
