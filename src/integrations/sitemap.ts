// Supplies published CMS routes and modification dates to Astro's official sitemap integration.
import sitemap from '@astrojs/sitemap';
import type { AstroIntegration } from 'astro';
import { getPublishedRouteManifest } from '../server/content/routes.ts';
import { canonicalPathUrl } from '../server/document-metadata.ts';

/** Configure Astro's sitemap generator with the published CMS detail routes.
 * @returns The official integration with a build hook that loads compact URL/date metadata.
 * Astro discovers fixed pages; customPages also includes published dynamic routes in SSR builds.
 */
export function publishedSitemap(): AstroIntegration {
  const customPages: string[] = [];
  const modifiedDates = new Map<string, string>();
  const integration = sitemap({
    customPages,
    changefreq: 'daily',
    priority: 0.7,
    /** Add a real CMS modification timestamp to this URL when one is available.
     * @param item Sitemap entry created by the official integration.
     * @returns The entry with its CMS lastmod; pages without a known edit time omit it.
     */
    serialize(item) {
      return { ...item, lastmod: modifiedDates.get(item.url) };
    },
  });

  return {
    ...integration,
    hooks: {
      ...integration.hooks,
      /** Load published route references before Astro builds either output target.
       * @returns After URLs and valid CMS dates are ready; full content records are not retained.
       */
      async 'astro:build:start'() {
        customPages.length = 0;
        modifiedDates.clear();
        const routes = await getPublishedRouteManifest();
        for (const route of routes) {
          const url = canonicalPathUrl(route.pathname);
          customPages.push(url);
          if (route.updatedAt && Number.isFinite(Date.parse(route.updatedAt))) {
            modifiedDates.set(url, new Date(route.updatedAt).toISOString());
          }
        }
      },
    },
  };
}
