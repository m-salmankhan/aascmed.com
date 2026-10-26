import { defineMiddleware } from 'astro:middleware';
import redirectRulesText from '../../static/_redirects?raw';
import { findRedirect, parseNetlifyRedirects } from './server/netlify-redirects';

const redirectRules = parseNetlifyRedirects(redirectRulesText);

export const onRequest = defineMiddleware((context, next) => {
  if (import.meta.env.PUBLIC_ASTRO_TARGET !== 'static') {
    context.response.headers.set('Cache-Control', 'private, no-store');
    context.response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    context.response.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'self' https://*.aascmed.com https://wise-positivity-21c2bd6b3f.strapiapp.com *aascmed.netlify.app",
    );
  }

  const redirect = findRedirect(context.url.pathname, redirectRules, context.url.search);
  if (redirect) return context.redirect(redirect.location, redirect.status);
  return next();
});
