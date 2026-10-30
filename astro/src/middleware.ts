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
    response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.aascmed.com https://wise-positivity-21c2bd6b3f.strapiapp.com https://aascmed.netlify.app",
    );
  }
  return response;
});
