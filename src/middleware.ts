// Keeps protected preview responses private and out of search indexes.
import { defineMiddleware } from 'astro:middleware';
import { previewReadiness } from './server/preview-readiness.ts';
import { previewOrigins } from './server/preview-origins.ts';

/** Apply the preview response policy after Astro renders the requested route.
 * @param context Astro request context; route matching remains Astro's responsibility.
 * @param next Continuation that renders the requested page or its normal 404.
 * @returns The route response with private caching, noindex and framing headers in preview.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const preview = import.meta.env.PUBLIC_ASTRO_TARGET !== 'static';
  let response;
  try {
    response = preview && context.request.method === 'GET' && context.url.pathname === '/_health/live'
      ? new Response('alive')
      : preview && context.request.method === 'GET' && context.url.pathname === '/_health/ready'
        ? await previewReadiness()
        : await next();
  } catch (error) {
    if (!preview) throw error;
    console.error('Preview request failed');
    response = new Response('Preview temporarily unavailable', { status: 503 });
  }
  if (preview) {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    const frameAncestors = ["'self'", ...previewOrigins()].join(' ');
    response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
  }
  return response;
});
