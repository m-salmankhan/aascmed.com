export type DraftPreview = { title: string; source: 'fixture' | 'strapi' };
const fixture: DraftPreview = { title: 'Proof draft: seasonal allergy update', source: 'fixture' };

/** One bounded request per page render. No response or draft data is cached. */
export async function getDraftPreview(): Promise<DraftPreview> {
  if (import.meta.env.PUBLIC_ASTRO_TARGET === 'static') return fixture;
  const strapiBaseUrl = process.env.GATSBY_STRAPI_API_URL;
  if (!strapiBaseUrl) return fixture;
  let url: URL;
  try {
    url = new URL('/api/blogs', strapiBaseUrl);
  } catch {
    return fixture;
  }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === 'localhost')) return fixture;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);
  try {
    const token = process.env.STRAPI_TOKEN;
    url.searchParams.set('status', 'draft');
    const headers = new Headers({ 'Cache-Control': 'no-store' });
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) return fixture;
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data)) return fixture;
    const firstBlog = body.data[0];
    if (!firstBlog || typeof firstBlog !== 'object' || !('title' in firstBlog)) return fixture;
    const title = firstBlog.title;
    if (typeof title !== 'string') return fixture;
    return { title: title.slice(0, 180), source: 'strapi' };
  } catch {
    return fixture;
  } finally {
    clearTimeout(timeout);
    // Cancel an unread error response body as well as any pending request.
    controller.abort();
  }
}
