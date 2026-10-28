/** The public canonical host stays fixed when a page is rendered in preview. */
export const canonicalOrigin = 'https://www.aascmed.com';

/** Resolve a route pathname without allowing a request to replace the canonical host. */
export function canonicalPathUrl(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (path.startsWith('//') || /[\\?#\u0000-\u0020]/.test(path)) {
    throw new Error('Canonical metadata requires a route pathname');
  }
  return new URL(path, canonicalOrigin).href;
}

/** Resolve a public image URL, retaining valid separately hosted HTTPS media. */
export function socialImageUrl(path: string): string {
  const url = new URL(path, canonicalOrigin);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Social metadata requires a public HTTPS image');
  }
  return url.href;
}

/** Serialize JSON-LD safely inside a script element, including authored closing tags. */
export function serializeStructuredData(value: Record<string, unknown> | Record<string, unknown>[]): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
