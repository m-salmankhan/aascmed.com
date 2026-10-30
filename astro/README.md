# Astro migration target

This package contains the static and Node SSR targets for the Gatsby-to-Astro migration. It currently provides the document layout, server-side content loaders, redirects and sitemaps. Page families, including the real homepage, are implemented separately. The Stage 1 proof page and its counter/draft demonstrations have been retired.

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

## Tests

From the repository root, run `yarn test:unit` for source contracts and `yarn test:astro` for Astro integration tests. Both root and Astro dependencies must be installed. Install the browser once with `yarn playwright install chromium`.

The document integration test builds the real static/SSR layouts and checks metadata, JSON-LD, tracking, headers, redirects, sitemaps and static assets. Its fixture route is created only during the test and removed afterward. No POC route or interactive demo is included in the app. The runtime test checks that Astro and shared UI dependencies resolve one React/Emotion installation.
