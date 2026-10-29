// Validates canonical/social URLs and serializes JSON-LD for Astro documents.
/** The public canonical host stays fixed when a page is rendered in preview. */
export const canonicalOrigin = "https://www.aascmed.com";
/** One JSON-LD entity, with schema.org properties supplied by the route. */
export type StructuredDataEntry = Record<string, unknown>;
/** JSON-LD for one entity or multiple entities on the same page. */
export type StructuredData = StructuredDataEntry | StructuredDataEntry[];
/** Social metadata category understood by the shared document. */
export type OpenGraphType = "website" | "article" | "profile";
/** Resolve a route pathname without allowing it to replace the public canonical host.
 * @param pathname Route path without query strings or fragments; a leading slash is optional.
 * @returns Absolute HTTPS URL on the public website, retaining the path's trailing slash.
 * @throws When the path contains host-changing syntax, whitespace, queries or fragments.
 */
export function canonicalPathUrl(pathname: string): string {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (path.startsWith("//") || /[\\?#\u0000-\u0020]/.test(path)) {
    throw new Error("Canonical metadata requires a route pathname");
  }
  return new URL(path, canonicalOrigin).href;
}
/** Resolve a social-card image against the public website.
 * @param path Site-relative asset path or absolute HTTPS media URL.
 * @returns Absolute HTTPS image URL, including separately hosted public media.
 * @throws When the URL uses another protocol or embeds credentials.
 */
export function socialImageUrl(path: string): string {
  const url = new URL(path, canonicalOrigin);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Social metadata requires a public HTTPS image");
  }
  return url.href;
}
/** Serialize JSON-LD without allowing authored HTML to close its script element.
 * @param value One schema.org entity or an array of entities supplied by the route.
 * @returns JSON text with literal less-than signs escaped; parsing recovers the original data.
 */
export function serializeStructuredData(value: StructuredData): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
