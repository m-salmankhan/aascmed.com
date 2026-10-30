# Astro page boundaries

Route files in `astro/src/pages` select the server content mode, load normalized CMS records and pass public display props to a concrete React page entry. Static routes use published content; a protected SSR deployment can select saved drafts through `ASTRO_CONTENT_MODE`. URL query parameters do not select this mode.

`server/pages` holds small mappings needed by routes, such as display dates and clinic choices. The domain loaders in `server/content/loaders.ts` own CMS queries and return normalized records. Collection loaders are lazy async iterators; retain only the display models required by the page. Detail `getStaticPaths` functions enumerate compact slugs, then each page loads its own record. SSR detail pages look up the requested slug directly and rewrite missing content to the shared 404 route.

`SitePage` passes metadata to `SiteDocument` and renders its default slot. Each route supplies a concrete entry from `components/pages` as that slot. The entry wraps its shared view in `ReactPage`, which supplies public site contexts and the announcement. View props are derived from the view's own `ComponentProps` contract. Keeping that tree inside one React entry preserves context during hydration. The page island renders meaningful HTML on the server and hydrates the existing navigation, forms and other controls with `client:load`. Browser storage and other browser-only state belong in effects so initial client markup matches the server.

Keep CMS credentials in server modules. Only normalized view props and the explicitly public runtime configuration cross the React island boundary. Contact tests must intercept submissions or use the synthetic local runtime API.
