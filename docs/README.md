# Development and deployment

## Local setup

Use the latest Node 22.x release selected by [`.node-version`](../.node-version), at least the minimum in [`package.json`](../package.json), and Yarn 1.22.22. The application has one package and lockfile at the repository root.

Configure the CMS and public service settings using the [environment variable inventory](environment-variables.md). Keep local credentials in private root `.env` files. The shared Astro config loads them through Vite; existing process variables take precedence. `--mode` selects mode-specific files, for example `yarn build --mode development`.

Run these commands from the repository root:

```sh
yarn install --frozen-lockfile
yarn dev
```

To check and serve a production build locally:

```sh
yarn typecheck
yarn build
yarn preview
```

`yarn build` writes the published static site to `dist/`. See the [testing guide](../tests/README.md) for unit, integration and browser checks.

## Netlify deployment

[`netlify.toml`](../netlify.toml) sets the build command to `yarn build` and the publish directory to `dist`. The base directory is the repository root. Netlify and CI select current Node 22.x releases from `.node-version`; CI explicitly checks for the latest matching release.

Set `STRAPI_API_URL`, `STRAPI_TOKEN`, `PUBLIC_RUNTIME_API_BASE_URL` and `PUBLIC_MAPBOX_API_KEY` in the relevant Netlify build context. Keep `ASTRO_CONTENT_MODE` unset or `published` for public deployments. GitHub Actions variables do not automatically reach Netlify; consult the [environment inventory](environment-variables.md) for the full contract.

The local plugin in `netlify/plugins/image-cache` preserves Astro image assets and social-card caches between builds. See [cache behavior and troubleshooting](../src/server/media/README.md#netlify-build-cache).

Review the Netlify deploy preview before merging. Check for Netlify UI context overrides of the committed settings. Preserve the CMS publish/unpublish build webhook, which is configured separately from this repository. Retain an immutable public deployment and its matching configuration for rollback; a pre-Astro rollback also needs its original Gatsby build settings and environment.

## Node SSR target

The separate Node target compiles request-time rendering:

```sh
yarn build:ssr
yarn start:ssr
```

Its output is `dist-ssr/`. Supply runtime settings through the server process; the compiled server does not automatically load root `.env` files. `HOST=127.0.0.1` and a free `PORT` can be used for a local check.

`Dockerfile.preview` packages that compiled server as a non-root process (UID 10002), without fetching CMS content during compilation. Build with the public browser settings and configured CMS/media origins. The running draft container requires `STRAPI_API_URL` and a private mounted `STRAPI_TOKEN_FILE`; its entry point refuses missing/empty/conflicting token settings. The CMS token is never a build argument.

`/_health/live` checks the process; `/_health/ready` checks that the mounted token can read a small draft response. Both still need protection at the preview gateway. CMS responses have a ten-second full-response deadline and an 8 MiB per-response limit; errors and health responses omit CMS content and credentials.

For a local container check, run `podman build -f Dockerfile.preview -t localhost/aascmed-preview:dev .` then `node scripts/check-preview-image.mjs podman localhost/aascmed-preview:dev`. It uses synthetic CMS data and a temporary secret volume to check permissions, health, fresh saved drafts, outages and shutdown. CI can use the same check with Docker.

This target does not include a deployed authentication gateway. Draft mode requires a protected deployment; setting `ASTRO_CONTENT_MODE=draft` does not provide authentication. The old Gatsby preview deployment and its `deploy-preview.yml` workflow were retired. Replacement infrastructure and editor setup remain [planned preview-platform work](../plans/preview-platform-plan.md).

## Further documentation

- [Environment variables](environment-variables.md): build, browser and server settings.
- [CMS access](../src/server/content/README.md): loaders, publication modes and generated types.
- [Page architecture](../src/server/pages/README.md): routes, views, redirects and sitemaps.
- [Media](../src/server/media/README.md): responsive images, social cards and caches.
- [Testing](../tests/README.md): local checks, browser comparisons and CI.
- [Astro migration validation](astro-stage3-parity.md): historical baseline, differences and evidence.
- [Migration plans](../plans/astro-migration-plan.md) and [ticket index](../plans/astro-migration-tickets.md): recorded decisions and deferred work.
