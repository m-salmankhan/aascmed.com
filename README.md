# Allergy, Asthma and Sinus Centers website

Astro is the default application at the repository root. Public deployments are static published-content builds; a separate Node SSR target remains available for the future authenticated editorial preview. Gatsby and the old Compose/Caddy preview deployment have been removed.

## Install and run

Use Node 22.23.4 or newer (see `.node-version`) and Yarn 1.22.22:

```sh
yarn install --frozen-lockfile
yarn dev
yarn typecheck
yarn build
yarn preview
```

`yarn build` writes the public site to `dist/`. Netlify uses the committed `netlify.toml`: **build command `yarn build`, publish directory `dist`, base directory empty/repository root**. Set `STRAPI_API_URL`, `STRAPI_TOKEN`, `PUBLIC_RUNTIME_API_BASE_URL` and `PUBLIC_MAPBOX_API_KEY` in the relevant Netlify build context. `ASTRO_CONTENT_MODE` defaults to published; do not set it to draft for public deployments. See [the complete environment inventory](docs/environment-variables.md).

Review this branch's Netlify deploy preview before merging. The repository configuration takes effect for the branch, while the live main deployment remains unchanged until it is promoted. Check any Netlify UI context overrides and remove old Gatsby build plugins/settings if still configured there. The public publish/unpublish build webhook is a separate CMS/hosting integration and must be preserved; this source change does not reconfigure it. Keep the previous immutable public deployment available for rollback. If rolling back to a pre-removal commit, restore its Gatsby build command/output and retained Gatsby environment settings as well.

For the separate Node target:

```sh
yarn build:ssr
yarn start:ssr
```

This target retains compiled request-time rendering; it does not include a deployed authentication gateway. New preview infrastructure and its beginner setup guide remain [deferred work](plans/preview-platform-plan.md). The removed Gatsby preview may be offline until that work is completed.

## Source layout

- `src/pages` and `src/layouts`: Astro routes and HTML documents.
- `src/components` and `src/views`: React page entries and existing UI.
- `src/content`, `src/config`, `src/data`, `src/navigation`: typed application contracts and browser-safe contexts.
- `src/server/content` and `src/server/pages`: server-only CMS access and display mappings.
- `src/server/media`: TypeScript social-card renderer and licensed font/logo assets.
- `static`: authored public assets, PDFs, headers and redirects copied by Astro.

There is one package and one lockfile. Page hydration behavior is retained; smaller React islands are separate WEB-50 work.

## CMS content

`STRAPI_API_URL` and the server-only `STRAPI_TOKEN` configure the official Strapi client. `STRAPI_API_URL` is the server-side CMS origin; the removed Gatsby variable is no longer read. See the [complete environment inventory](docs/environment-variables.md) for deployment locations. Published reads leave caching to the server; draft reads send `no-store` and require `ASTRO_CONTENT_MODE=draft` on the protected preview deployment. Static builds reject draft requests. The SDK uses its public transport defaults, including its 10-second timeout until response headers arrive and normal fetch redirects. Errors are sanitized before reaching callers.

Collection loaders are lazy async iterators:

```ts
for await (const blog of getBlogs('published', { pageSize: 25 })) {
  // Process this record before requesting more content.
}
```

The default CMS batch size is 100, configurable from 1 to 100. Constructing `getPublishedCollections()` starts no requests, and stopping iteration leaves later pages unfetched. Detail and single-type loaders return promises. SDK queries, mapping and validation are visible together in each domain loader.

`PUBLIC_RUNTIME_API_BASE_URL` and `PUBLIC_MAPBOX_API_KEY` are safe browser settings. They are separate from the CMS URL and credential; never expose the token as a public variable.

`PREVIEW_FRAME_ORIGINS` optionally adds comma-separated editor origins permitted to embed protected preview pages. The configured CMS API origin and the preview itself are already permitted; no Strapi tenant hostname is hardcoded.

Legacy redirects remain in `static/_redirects` for the public hosting platform. The preview server uses Astro’s current routes and normal 404 handling; it does not implement legacy URL redirects.

## Sitemaps

The official `@astrojs/sitemap` integration discovers Astro pages and adds published CMS detail URLs through `customPages`, including in preview builds. It writes the existing `sitemap-index.xml` and `sitemap-0.xml` URLs, preserves Gatsby’s daily frequency and 0.7 priority, and uses CMS `updatedAt` for `lastmod`. Unknown edit dates are omitted. Preview sitemaps contain published URLs as of the build; draft URLs are excluded. XML serialization, escaping and large-sitemap splitting belong to the integration.

## Tests

From the repository root, run `yarn test:unit` for source contracts and `yarn test:astro` for Astro integration tests. Install the root dependencies first. Install the browser once with `yarn playwright install chromium`.

The integration tests build the real static/SSR site against a synthetic local CMS and check every route family, metadata, JSON-LD, tracking, headers, sitemaps and static assets. Browser checks cover hydration, navigation, notices, booking, carousels, timezone boundaries and synthetic form responses. Mutable draft checks create, edit, rename and delete records without rebuilding, and scan published artifacts for draft content and credentials. Its fixture route is created only during the test and removed afterward. No POC route or interactive demo is included in the app. The runtime test checks that Astro and shared UI dependencies resolve one React/Emotion installation.

## Social cards

The Node renderer in `src/server/media/social-cards.ts` composes branded Open Graph cards using the maintained font and logo. Existing public card URLs are preserved. Canvas and sharp are declared application dependencies. Keep generated cache files outside public output.

The shared Astro config reads the repository's `.env` files using Vite's loader; existing process variables take precedence. Use `yarn build --mode development` for the local development settings. `STRAPI_API_URL` supplies the CMS origin. If uploads live on a separate CDN, list its full origin in `STRAPI_MEDIA_ORIGINS` (comma-separated, including any custom port). Both Astro images and social cards receive the same origins. There is no tenant hostname default or separate host-policy helper.

The static image hook reads only the published blogs, conditions, and clinics needed for social cards. It stages those cards outside the public asset directory and reuses their small cache metadata between builds. Astro creates responsive CMS image outputs through `astro:assets` while pages render; each page owns the record it displays. Reviews are not fetched for social-card generation.

## Page implementation and parity

[Page boundaries](src/server/pages/README.md) explains how route files, loaders, display mappings and shared React views fit together. Astro owns routing, image transforms and sitemap serialization. The application keeps only compact static path lists and the display models needed by each page; CMS collections remain paginated lazy streams.

Set the public Runtime API and Mapbox variables explicitly for the environment being tested. The CMS credential is separate and remains server-only. The public homepage has no Netlify Identity login hooks; protected preview authentication belongs to the deployment stage.

[Stage 3 validation](docs/astro-stage3-parity.md) records the matched Gatsby baseline, browser comparisons, deliberate differences and screenshot evidence. Stage 4 deployment remains separate.

## Responsive CMS images

Astro owns image fetching, transforms, responsive candidates, output files and disk caching. The small `server/content/astro-media.ts` adapter passes normal native `width`, `layout` and `sizes` inputs to `getImage()` and converts the returned attributes for the shared React image component. Astro components cannot be rendered directly inside those React views; this is the [documented framework-component use of getImage](https://docs.astro.build/en/guides/images/#generating-images-with-getimage).

Callers supply the existing view's intended display width, just as the Gatsby image queries did. Astro's constrained layout generates density variants bounded by the source; lazy `sizes="auto"` lets the browser use the actual CSS slot. The hero uses native full-width layout. There is no application-wide pixel ceiling or handwritten candidate-width list.

Authorized remote uploads produce local `/_astro/` files during static builds and native on-demand image URLs in SSR. Relative rich-text image URLs are resolved against the configured CMS and prepared through the same service; SVGs and static provider social images also have local build output. The native integration test verifies actual remote-source output pixels and files, including a small thumbnail and a wide image above 1920px. Live Mapbox maps remain a separate runtime map integration.
