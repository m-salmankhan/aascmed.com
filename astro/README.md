# Astro migration target

This package contains the static and Node SSR targets for the Gatsby-to-Astro migration. It renders the homepage, fixed pages, archives and all five CMS detail families using the existing shared React views. Static production builds use published content; protected Node SSR preview resolves saved drafts per request. The Stage 1 proof page and its counter/draft demonstrations have been retired.

## Install and run

Use Node 22.23.4 or newer within the supported SDK runtime range. From the repository root:

```sh
yarn install --frozen-lockfile
yarn --cwd astro install --frozen-lockfile
yarn --cwd astro typecheck
yarn astro:static
yarn astro:ssr:build
yarn astro:ssr:start
```

The shared, static and SSR Astro configurations are TypeScript files and are included in the Astro typecheck, which also runs in CI.

React, ReactDOM and Emotion are supplied by the root package. Keep their Vite deduplication and SSR external settings so shared components use one runtime. `SiteDocument` applies the existing shared global stylesheet; page views do not need a demo wrapper to receive it.

## CMS content

`GATSBY_STRAPI_API_URL` and the server-only `STRAPI_TOKEN` configure the official Strapi client. Published reads leave caching to the server; draft reads send `no-store` and require `ASTRO_CONTENT_MODE=draft` on the protected preview deployment. Static builds reject draft requests. The SDK uses its public transport defaults, including its 10-second timeout until response headers arrive and normal fetch redirects. Errors are sanitized before reaching callers.

Collection loaders are lazy async iterators:

```ts
for await (const blog of getBlogs('published', { pageSize: 25 })) {
  // Process this record before requesting more content.
}
```

The default CMS batch size is 100, configurable from 1 to 100. Constructing `getPublishedCollections()` starts no requests, and stopping iteration leaves later pages unfetched. Detail and single-type loaders return promises. SDK queries, mapping and validation are visible together in each domain loader.

`PUBLIC_RUNTIME_API_BASE_URL` and `PUBLIC_MAPBOX_API_KEY` are safe browser settings. They are separate from the CMS URL and credential; never expose the token as a public variable.

`PREVIEW_FRAME_ORIGINS` optionally adds comma-separated editor origins permitted to embed protected preview pages. The configured CMS API origin and the preview itself are already permitted; no Strapi tenant hostname is hardcoded.

In the SSR preview target, the CMS API origin and `PREVIEW_FRAME_ORIGINS` also define the exact origins trusted for Strapi's saved-update `postMessage`. The listener is emitted only for preview, accepts messages only from the iframe's parent at one of those origins, handles only `strapiUpdate`, and announces `previewReady` only to those configured origins. A direct preview tab remains usable and does not install this listener. Strapi's documented Preview feature disables its link while edits are unsaved; this integration reloads after a saved update and does not provide unsaved live editing.

Legacy redirects remain in `static/_redirects` for the public hosting platform. The preview server uses Astro’s current routes and normal 404 handling; it does not implement legacy URL redirects.

## Sitemaps

The official `@astrojs/sitemap` integration discovers Astro pages and adds published CMS detail URLs through `customPages`, in static builds. The compiled preview build omits sitemap generation so it needs no CMS connection or token at image-build time. It writes the existing `sitemap-index.xml` and `sitemap-0.xml` URLs, preserves Gatsby’s daily frequency and 0.7 priority, and uses CMS `updatedAt` for `lastmod`. Unknown edit dates are omitted. The preview target does not generate a sitemap. XML serialization, escaping and large-sitemap splitting belong to the integration.

## Tests

From the repository root, run `yarn test:unit` for source contracts and `yarn test:astro` for Astro integration tests. Both root and Astro dependencies must be installed. Install the browser once with `yarn playwright install chromium`.

The integration tests build the real static/SSR site against a synthetic local CMS and check every route family, metadata, JSON-LD, tracking, headers, sitemaps and static assets. Browser checks cover hydration, navigation, notices, booking, carousels, timezone boundaries and synthetic form responses. Mutable draft checks create, edit, rename and delete records without rebuilding, and scan published artifacts for draft content and credentials. Its fixture route is created only during the test and removed afterward. No POC route or interactive demo is included in the app. The runtime test checks that Astro and shared UI dependencies resolve one React/Emotion installation.

## Social cards

The Node renderer in `src/shared/media/social-cards.mjs` composes branded Open Graph cards using the maintained font and logo. Gatsby retains its existing public card filenames through a compatibility adapter. Install root dependencies first; canvas and sharp are root-provided peers. Keep generated cache files outside public output.

The shared Astro config reads the repository's `.env` files using Vite's loader; existing process variables take precedence. Use `yarn astro:static --mode development` for the local development settings. `GATSBY_STRAPI_API_URL` supplies the CMS origin. If uploads live on a separate CDN, list its full origin in `STRAPI_MEDIA_ORIGINS` (comma-separated, including any custom port). Both Astro images and social cards receive the same origins. There is no tenant hostname default or separate host-policy helper.

The static image hook reads only the published blogs, conditions, and clinics needed for social cards. It stages those cards outside the public asset directory and reuses their small cache metadata between builds. Astro creates responsive CMS image outputs through `astro:assets` while pages render; each page owns the record it displays. Reviews are not fetched for social-card generation.

## Page implementation and parity

[Page boundaries](src/server/pages/README.md) explains how route files, loaders, display mappings and shared React views fit together. Astro owns routing, image transforms and sitemap serialization. The application keeps only compact static path lists and the display models needed by each page; CMS collections remain paginated lazy streams.

Set the public Runtime API and Mapbox variables explicitly for the environment being tested. The CMS credential is separate and remains server-only. The Gatsby homepage's old Netlify Identity login hooks are omitted from the public Astro homepage; protected preview authentication belongs to the deployment stage.

[Stage 3 validation](../docs/astro-stage3-parity.md) records the matched Gatsby baseline, browser comparisons, deliberate differences and screenshot evidence. Stage 4 deployment remains separate.

## Responsive CMS images

Astro owns image fetching, transforms, responsive candidates, output files and disk caching. The small `server/content/astro-media.ts` adapter passes normal native `width`, `layout` and `sizes` inputs to `getImage()` and converts the returned attributes for the shared React image component. Astro components cannot be rendered directly inside those React views; this is the [documented framework-component use of getImage](https://docs.astro.build/en/guides/images/#generating-images-with-getimage).

Callers supply the existing view's intended display width, just as the Gatsby image queries did. Astro's constrained layout generates density variants bounded by the source; lazy `sizes="auto"` lets the browser use the actual CSS slot. The hero uses native full-width layout. There is no application-wide pixel ceiling or handwritten candidate-width list.

Authorized remote uploads produce local `/_astro/` files during static builds and native on-demand image URLs in SSR. Relative rich-text image URLs are resolved against the configured CMS and prepared through the same service; SVGs and static provider social images also have local build output. The native integration test verifies actual remote-source output pixels and files, including a small thumbnail and a wide image above 1920px. Live Mapbox maps remain a separate runtime map integration.
