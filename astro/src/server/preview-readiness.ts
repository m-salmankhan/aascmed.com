// Readiness checks that runtime draft credentials can read a small CMS response.
export const previewReadiness = async () => {
  try {
    if (process.env.ASTRO_CONTENT_MODE !== 'draft' || !process.env.STRAPI_TOKEN || !process.env.GATSBY_STRAPI_API_URL) {
      throw new Error('Preview configuration missing');
    }
    const url = new URL(process.env.GATSBY_STRAPI_API_URL);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid CMS URL');
    }
    const base = url.pathname.replace(/\/$/, '');
    url.pathname = `${base.endsWith('/api') ? base : `${base}/api`}/blogs`;
    url.search = new URLSearchParams({ status: 'draft', 'pagination[pageSize]': '1' }).toString();
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.STRAPI_TOKEN}`, Accept: 'application/json', 'Cache-Control': 'no-store' },
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    // Headers and a readable draft collection establish dependency readiness.
    if (!response.ok) throw new Error('CMS unavailable');
    const body = await response.json();
    if (!body || !Array.isArray(body.data)) throw new Error('Invalid CMS response');
    return new Response('ready', { status: 200 });
  } catch {
    return new Response('not ready', { status: 503 });
  }
};
