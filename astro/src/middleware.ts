// Keeps protected preview responses private and out of search indexes.
import { defineMiddleware } from 'astro:middleware';
import { previewReadiness } from './server/preview-readiness';

/** Apply the preview response policy after Astro renders the requested route.
 * @param context Astro request context; route matching remains Astro's responsibility.
 * @param next Continuation that renders the requested page or its normal 404.
 * @returns The route response with private caching, noindex and framing headers in preview.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const preview = import.meta.env.PUBLIC_ASTRO_TARGET !== 'static';
  const path = context.url.pathname.replace(/\/$/, '');
  const response = preview && path === '/_health/live'
    ? new Response('ok')
    : preview && path === '/_health/ready'
      ? await previewReadiness()
      : await next();
  if (import.meta.env.PUBLIC_ASTRO_TARGET !== 'static') {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    const configuredParents = (process.env.PREVIEW_FRAME_ORIGINS || '').split(/\s+/).filter(Boolean);
    const parentOrigins = configuredParents.map((value) => new URL(value).origin);
    const frameAncestors = ["'self'", ...new Set(parentOrigins)].join(' ');
    response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
  }
  return response;
});
