// Provides compact route parameters and display dates for shared content pages.
import { getPublishedRouteManifest, type PublishedRouteKind } from '../content/routes';

/** Read only published route references for Astro's static path enumeration.
 * @param kind Detail route family to enumerate.
 * @param prefix Public route prefix to remove from each path.
 * @returns Astro params containing only each route's relative slug.
 */
export async function contentPaths(kind: PublishedRouteKind, prefix: string) {
  const routes = await getPublishedRouteManifest();
  return routes
    .filter((route) => route.kind === kind)
    .map((route) => ({
      params: { slug: route.pathname.slice(prefix.length).replace(/\/$/, '') },
    }));
}

/** Format a CMS date as Gatsby's ordinal day, full month and year.
 * @param value ISO calendar date from a blog record.
 * @returns Display date, or an empty string when the CMS supplied none.
 */
export function blogDate(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return '';
  const day = date.getUTCDate();
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] || 'th';
  const month = date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' });
  return `${day}${suffix} ${month} ${date.getUTCFullYear()}`;
}
