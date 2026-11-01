# Environment variables during the Gatsby-to-Astro migration

This inventory describes the code in MR #160, revised 1 November 2026. Gatsby and Astro can coexist: **keep `GATSBY_STRAPI_API_URL` for Gatsby and add `STRAPI_API_URL` for Astro**. Neither CMS setting falls back to the other. They may contain the same CMS origin, but can also point at different instances.

The new Traefik/Podman/Ansible preview is still a plan. Do not create credentials for that future system yet. The legacy Gatsby preview retains its original configuration in this MR.

## Website hosting and local development

Set these in the build environment of the relevant hosting deployment (for example, Netlify's production or deploy-preview context). GitHub Actions variables do not automatically reach Netlify. For local Gatsby, use the repository root `.env.development` or `.env.production`, matching the command. At build/dev time Astro loads root `.env` files through Vite; `--mode` selects mode-specific files, and existing process variables take precedence. The compiled Astro SSR process must receive its server settings from its launch environment; it does not automatically load the root env files. Never commit private environment files.

| Variable | Used by | What to set / default | Exposure and timing |
| --- | --- | --- | --- |
| `GATSBY_STRAPI_API_URL` | Gatsby | Existing CMS origin, for example `https://admin.aascmed.com`. Keep the current value. Gatsby defaults to `http://localhost:1337`, which is unsuitable for a remote deployment. | Used at Gatsby build/develop time; the `GATSBY_` name permits browser exposure. Not a credential. |
| `STRAPI_API_URL` | Astro | Astro's CMS origin; copy the existing Gatsby origin if both use the same CMS. Required; no fallback to Gatsby or localhost. | Server-side: needed during static builds and SSR builds that fetch published sitemap data, plus at SSR runtime for reads/framing. |
| `STRAPI_TOKEN` | Both | Content API token for the selected CMS. Use read-only published-content permissions for public builds; draft-read permissions only for protected preview. The same variable name can hold different credentials in different deployments. | Server/build secret. Never prefix with `GATSBY_` or `PUBLIC_`. If two CMS instances require different tokens, run their builds with separate environment values. |
| `GATSBY_API_BASE_URL` | Gatsby | `https://api.aascmed.com` for the contact-form API, or that environment's equivalent. Default: `https://api.aascmed.com`. | Browser-visible, embedded during build/develop. Separate from the CMS URL. |
| `GATSBY_MAPBOX_API_KEY` | Gatsby | Existing public Mapbox access token for maps and generated clinic social cards. Missing value leaves the map token empty. | Browser-visible; available during build/develop. Use a public token with suitable URL restrictions. |
| `PUBLIC_RUNTIME_API_BASE_URL` | Astro | `https://api.aascmed.com` for the contact-form API, or that environment's equivalent. Default: `https://api.aascmed.com`. | Browser-visible, embedded at build time, including SSR builds. |
| `PUBLIC_MAPBOX_API_KEY` | Astro | Public Mapbox access token for the Astro maps; it can be the same public token as Gatsby's. Missing value leaves the browser map token empty. | Browser-visible, embedded at build time. Astro's static social-card generator alone also has an existing fallback to `GATSBY_MAPBOX_API_KEY`; browser maps do not. Set this explicitly for consistent results. |
| `GATSBY_IS_PREVIEW` | Gatsby | `false` or unset for public builds; `true` for legacy draft preview. Only the exact string `true` enables preview. | Build/develop flag. Legacy Compose sets `true` automatically. |
| `ASTRO_CONTENT_MODE` | Astro | `published` or unset for public builds. `draft` only for an authenticated SSR preview. Static targets reject draft reads even with this flag. | Server runtime flag. It does not install authentication. |
| `STRAPI_MEDIA_ORIGINS` | Astro | Optional comma-separated **origins**, such as `https://uploads.example.com,https://cdn.example.com:9443`. Empty if all uploads use the CMS origin. No paths, queries or fragments. | Build-time image/social-card allowlist. `STRAPI_API_URL`'s origin is included automatically. |
| `PREVIEW_FRAME_ORIGINS` | Astro SSR | Optional comma-separated extra editor origins. Empty if only the configured CMS origin and preview itself embed it. | Server runtime framing policy. Does not affect the legacy Caddy preview. |

For a public environment running both builds, configure the first seven variables explicitly. Keep `GATSBY_IS_PREVIEW=false` and `ASTRO_CONTENT_MODE=published`; the remaining two are optional. Retain Gatsby settings until Gatsby retirement. Changing any embedded browser value requires a new build.

Gatsby's prefix is needed for browser access, not for Node configuration. `gatsby-config.ts` can read unprefixed secrets such as `STRAPI_TOKEN`. Astro uses `PUBLIC_` for intentional browser settings. See [Gatsby's environment documentation](https://www.gatsbyjs.com/docs/how-to/local-development/environment-variables/) and [Astro's environment documentation](https://docs.astro.build/en/guides/environment-variables/).

## Existing Gatsby preview: GitHub Actions settings

Only needed while using the existing `Deploy Preview Server` workflow. Configure these under repository **Settings → Secrets and variables → Actions**; existing values can stay as they are. `STRAPI_API_URL` and Astro's `PUBLIC_*` variables are not consumed by this legacy deployment workflow.

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `PREVIEW_SERVER_HOST` | Existing VPS hostname/IP. |
| Secret | `PREVIEW_SERVER_USER` | Existing deployment SSH username. |
| Secret | `PREVIEW_SERVER_SSH_KEY` | That user's deployment private SSH key. |
| Secret | `STRAPI_TOKEN` | Existing preview CMS Content API token with draft-read access. |
| Secret | `GATSBY_REFRESH_TOKEN` | Existing Gatsby refresh webhook token; must match the webhook's authorization value. |
| Secret | `GATSBY_MAPBOX_API_KEY` | Existing public Mapbox token (stored as an Actions secret by this workflow, but browser-visible in Gatsby). |
| Variable | `GATSBY_STRAPI_API_URL` | Existing CMS origin; no `/admin` or `/api` suffix. |
| Variable | `GATSBY_API_BASE_URL` | Contact API origin, normally `https://api.aascmed.com`. |
| Variable | `PREVIEW_DOMAIN` | Existing preview hostname, normally `preview.aascmed.com`. |
| Variable | `PREVIEW_CERTS_PATH` | Absolute directory on the VPS containing `cert.pem` and `key.pem`. |

GitHub supplies `GITHUB_TOKEN`; do not create it manually. `REGISTRY`, `IMAGE_NAME` and `AUTH_IMAGE_NAME` are generated/set inside the workflow. No Astro deployment credentials need to be added to that workflow. The legacy workflow/secret handling is retained here and will be retired under the public-first plan. It still runs on pushes to `main`, so merging this MR can trigger the existing Gatsby preview deployment. `GATSBY_REFRESH_TOKEN` is a sensitive legacy exception to the public-prefix convention; the existing Gatsby development server exposes refresh metadata, so this inventory does not treat the token as a new secure authentication mechanism.

## Existing Gatsby preview: manual Compose settings

If operating the legacy host manually, copy `preview-server/example.env` to a private `.env` **beside the deployed Compose file**. Set `GATSBY_STRAPI_API_URL`, `STRAPI_TOKEN`, `GATSBY_REFRESH_TOKEN`, `GATSBY_MAPBOX_API_KEY`, `GATSBY_API_BASE_URL`, `PREVIEW_DOMAIN` and `PREVIEW_CERTS_PATH` as above. The existing workflow writes these values itself; no manual rename is needed.

| Additional variable | What to set / default |
| --- | --- |
| `PREVIEW_IMAGE` | Existing website preview image reference when pulling a built image; leave empty only when deliberately building locally with Compose. Generated by CI. |
| `AUTH_IMAGE` | Existing auth image reference when pulling a built image; leave empty only for a local Compose build. Generated by CI. |
| `PREVIEW_HTTPS_PORT` | Manual Compose default `443`; the existing deployment workflow sets `8443`. Keep the value matching the current host's routing. |
| `PREVIEW_HTTP_PORT` | Manual Compose default `80`; the existing deployment workflow sets `8080`. |

Compose maps the host's `GATSBY_STRAPI_API_URL` into the auth container as `STRAPI_URL`. You do **not** need to set an additional host `STRAPI_URL`. Compose also supplies `GATSBY_IS_PREVIEW=true`, `ENABLE_GATSBY_REFRESH_ENDPOINT=true`, and `NODE_OPTIONS=--max-old-space-size=700`; the Dockerfile supplies `NODE_ENV=development` and `GATSBY_TELEMETRY_DISABLED=1`. These are already managed by the legacy deployment.

When running the old forward-auth process directly, rather than through Compose, set `STRAPI_URL` to the CMS origin. Its optional `COOKIE_NAME` defaults to `preview_jwt` and `PORT` to `3001`. Stock Compose does not pass overrides for those two; Caddy expects auth on port 3001.

## Optional tools and process settings

These are not required in ordinary website hosting settings.

| Variable | When needed / default |
| --- | --- |
| `STRAPI_URL` | Historical `scripts/migrate-*.js` content-import commands. Default `http://localhost:1337`. Conditions/providers/service-update scripts also accept `GATSBY_STRAPI_API_URL` as a fallback. These commands **write** CMS content and require a separate appropriate `STRAPI_TOKEN`; do not run them as part of normal site deployment. The Astro rename does not change their contract. |
| `DEBUG` | Optional verbose output for conditions/providers migration scripts; unset normally. Any nonempty value enables it. |
| `SKIP_FAQ` | Optional conditions migration flag; unset normally. Any nonempty value skips FAQ import. |
| `UI_BASE_URL` | Candidate site root when running browser regression comparisons manually. Required for that command only. |
| `UI_REFERENCE_URL` | Distinct, matched-content reference site root for browser comparisons. Required for that command only. |
| `UI_SITEMAP_PATH` | Optional comparison sitemap path, default `/sitemap-index.xml`. |
| `HOST` | Optional compiled Astro Node SSR listen address, supplied to its server process. For a local check, use `127.0.0.1`; otherwise the adapter uses its compiled host setting. It does not install authentication. |
| `PORT` | Optional process listen port: Astro Node SSR uses it at runtime; Gatsby develop also accepts it as the default when no CLI port is supplied (normally 8000). Supply it separately to each process when running both. |
| `GATSBY_HOST` | Optional Gatsby develop listen address when no CLI host is supplied. Legacy Compose already passes `-H 0.0.0.0`. |
| `NODE_ENV` | Normally managed by Gatsby/Astro commands and hosting. Use normal development/production commands; it also affects which root env files Gatsby loads. |
| `NODE_OPTIONS` | Optional Node process tuning. Legacy Compose already supplies its memory limit. |

`PUBLIC_ASTRO_TARGET` is defined internally as `static` or `server`; do not set it yourself. The regression workflow derives its `INPUT_*`, `UI_PULL_REQUEST_NUMBER`, `UI_CANDIDATE_COMMIT`, `UI_COMMENT_ID`, `UI_BASELINE_ID` and `UI_REPORT_ARTIFACT_URL` values from workflow inputs/results, not repository configuration. The normal unit/integration suites generate synthetic CMS settings and do not need production credentials.

No changes to the Strapi CMS server's own environment are required by this MR.
