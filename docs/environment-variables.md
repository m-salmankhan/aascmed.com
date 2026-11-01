# Environment variables for the root Astro application

Set these in the relevant Netlify build context (production or deploy preview), or in a private root `.env` / `.env.production` file for local builds. GitHub Actions variables do not automatically reach Netlify. Existing process variables override Vite's root env files; `--mode` selects mode-specific files. Compiled SSR runtime settings must be supplied by the process manager; the server does not automatically load root env files.

| Variable | Set it to | When used |
| --- | --- | --- |
| `STRAPI_API_URL` | CMS origin, normally the value previously used by Gatsby; for example `https://admin.aascmed.com`. Required; no Gatsby fallback. | Build-time CMS reads and media allowlist; SSR runtime reads and framing. |
| `STRAPI_TOKEN` | Server-only Content API token scoped to published reads for the public site. A protected draft deployment needs its own appropriately scoped draft-read token. | Build/server secret; never use `PUBLIC_`. |
| `PUBLIC_RUNTIME_API_BASE_URL` | Contact API origin, normally `https://api.aascmed.com` (also the default). Separate from Strapi. | Intentionally browser-visible; embedded at build time. |
| `PUBLIC_MAPBOX_API_KEY` | Public Mapbox token for maps and clinic social cards. Set explicitly; no Gatsby fallback remains. | Browser-visible; embedded at build time and used by image generation. |
| `ASTRO_CONTENT_MODE` | `published` or unset for public deployments. `draft` only on an authenticated SSR preview. Static builds reject draft reads. | Server content mode; does not install authentication. |
| `STRAPI_MEDIA_ORIGINS` | Optional comma-separated extra upload/CDN origins including ports. No paths/queries/fragments. Empty if uploads use the CMS origin. | Build-time allowlist; the CMS origin is included automatically. |
| `PREVIEW_FRAME_ORIGINS` | Optional comma-separated extra editor origins. The configured CMS origin and preview itself are already permitted. | SSR runtime framing policy. |

Changing an embedded browser value requires a new build. Mapbox tokens are public tokens with appropriate URL restrictions. CMS tokens stay server-side and are never embedded in page props, browser variables or generated image assets.

The removed Gatsby variables (`GATSBY_STRAPI_API_URL`, `GATSBY_API_BASE_URL`, `GATSBY_MAPBOX_API_KEY`, preview/refresh flags) are no longer application configuration. Copy their public URL/Mapbox values to the corresponding settings above for this branch. Retain the old hosting values and exact build settings privately for the pre-removal rollback deployment until acceptance/retention gates pass; do not revoke old credentials as part of source cleanup. The old Gatsby preview workflow, images, Caddy and forward-auth configuration are removed from source. No new VPS, registry or auth credentials are required yet.

## Optional tools and process settings

- `HOST` and `PORT`: compiled Node SSR listen settings. For a local check, use `HOST=127.0.0.1` and a free port. The default adapter settings otherwise apply; these do not secure the server.
- `NODE_ENV` and `NODE_OPTIONS`: normally supplied by commands/hosting; optional Node mode/memory tuning. Netlify's `NODE_VERSION=22.23.4` is pinned in `netlify.toml` and `.node-version` records the minimum local runtime.
- Historical `scripts/migrate-*.js` commands use `STRAPI_URL` (default `http://localhost:1337`) and an appropriately scoped `STRAPI_TOKEN`. These commands write CMS content and are not deployment steps. Optional `DEBUG` enables verbose conditions/providers logging; any nonempty `SKIP_FAQ` skips FAQ import for conditions.
- Manual browser regression comparisons need `UI_BASE_URL` and distinct matched-content `UI_REFERENCE_URL`; optional `UI_SITEMAP_PATH` defaults to `/sitemap-index.xml`.

`PUBLIC_ASTRO_TARGET` is assigned internally by the static/SSR configs; do not set it. GitHub supplies `GITHUB_TOKEN`; workflow inputs/results supply the `INPUT_*` and reporting `UI_*` settings automatically. Unit/integration tests use synthetic CMS credentials; do not provide production tokens to them.

No CMS server environment changes are made by this MR. Preserve its public content-publish build webhook. Removing the external legacy Gatsby refresh registration, retiring the old host and revoking unused credentials are separate operator steps after the retained rollback policy is satisfied.
