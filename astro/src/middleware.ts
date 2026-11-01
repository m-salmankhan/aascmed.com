// Keeps protected preview responses private and out of search indexes.
import { defineMiddleware } from 'astro:middleware';

/** Apply the preview response policy after Astro renders the requested route.
 * @param context Astro request context; route matching remains Astro's responsibility.
 * @param next Continuation that renders the requested page or its normal 404.
 * @returns The route response with private caching, noindex and framing headers in preview.
 */
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  if (import.meta.env.PUBLIC_ASTRO_TARGET !== 'static') {
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    const configuredParents = [
      process.env.STRAPI_API_URL,
      ...(process.env.PREVIEW_FRAME_ORIGINS || '').split(','),
    ].filter((value) => value?.trim());
    const parentOrigins = configuredParents.map((value) => new URL(value!.trim()).origin);
    const frameAncestors = ["'self'", ...new Set(parentOrigins)].join(' ');
    response.headers.set('Content-Security-Policy', `frame-ancestors ${frameAncestors}`);
  }
  return response;
});
