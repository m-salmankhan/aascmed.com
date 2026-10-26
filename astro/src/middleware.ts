import { defineMiddleware } from 'astro:middleware';
import redirectRulesText from '../../static/_redirects?raw';
import { findRedirect, parseNetlifyRedirects } from './server/netlify-redirects';

const redirectRules = parseNetlifyRedirects(redirectRulesText);

export const onRequest = defineMiddleware((context, next) => {
  const isPreview = import.meta.env.PUBLIC_ASTRO_TARGET !== 'static';
  const redirect = findRedirect(context.url.pathname, redirectRules, context.url.search);
  const responsePromise = redirect
    ? Promise.resolve(context.redirect(redirect.location, redirect.status))
    : next();

  return responsePromise.then((response) => {
    if (isPreview) {
      response.headers.set('Cache-Control', 'private, no-store');
      response.headers.set('X-Robots-Tag', 'noindex, nofollow');
      response.headers.set(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://*.aascmed.com https://wise-positivity-21c2bd6b3f.strapiapp.com *aascmed.netlify.app",
      );
    }
    return response;
  });
});
