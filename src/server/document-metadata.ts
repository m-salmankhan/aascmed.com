// Validates canonical/social URLs and serializes JSON-LD for Astro documents.
/** The public canonical host stays fixed when a page is rendered in preview. */
import { siteSettings } from '../config/site.ts';
export const canonicalOrigin = siteSettings.url;
export { serializeStructuredData } from '../utils/structured-data.ts';
export type {
  StructuredData,
  StructuredDataEntry,
} from '../utils/structured-data.ts';
/** Social metadata category understood by the shared document. */
export type OpenGraphType = 'website' | 'article' | 'profile';
/** Resolve a route pathname without allowing it to replace the public canonical host.
 * @param pathname Route path without query strings or fragments; a leading slash is optional.
 * @returns Absolute HTTPS URL on the public website, retaining the path's trailing slash.
 * @throws When the path contains host-changing syntax, whitespace, queries or fragments.
 */
export function canonicalPathUrl(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (path.startsWith('//') || /[\\?#\u0000-\u0020]/.test(path)) {
    throw new Error('Canonical metadata requires a route pathname');
  }
  return new URL(path, canonicalOrigin).href;
}
/** Resolve a social-card image against the public website.
 * @param path Site-relative asset path or absolute HTTPS media URL; HTTP loopback is allowed for local development.
 * @returns Absolute HTTPS image URL, including separately hosted public media.
 * @throws When the URL uses another protocol or embeds credentials.
 */
export function socialImageUrl(path: string): string {
  const url = new URL(path, canonicalOrigin);
  const localHttp =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !localHttp) ||
    url.username ||
    url.password
  ) {
    throw new Error('Social metadata requires a public HTTPS image');
  }
  return url.href;
}
