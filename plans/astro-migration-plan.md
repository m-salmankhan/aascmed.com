# Gatsby to Astro migration plan

Status: approved for staged implementation and ticket breakdown on 25 October 2026.

## Recommendation

Keep Strapi and the existing React components. Replace Gatsby's data queries, routing, document/head handling, image preparation, and preview runtime with explicit adapters and Astro page entry points.

Use two deployments from the same Astro source:

- **Public website:** static Astro output on the existing public hosting, fetching published Strapi content during builds.
- **Editorial preview:** a compiled Astro Node SSR application behind the existing Caddy and Strapi administrator authentication services, fetching saved drafts on each request.

This addresses the preview problem without making every public page request depend on Strapi availability. A content save should require neither an application rebuild nor a Gatsby refresh operation to become visible in preview. An already-open preview still needs a reload or a verified Strapi update message; SSR does not automatically push changes into an open browser.

The component reuse goal is realistic. Rewriting all components as `.astro` files is unnecessary. Most work is at framework boundaries, although page components currently combine data transformation, layout, and Gatsby APIs and will need to be separated. Astro explicitly supports reusing React UI, with hydration selected at the Astro boundary. [Astro's Gatsby migration guide](https://docs.astro.build/en/guides/migrate-to-astro/from-gatsby/)

Emotion is the initial preference, **conditional on a clean architectural fit**. Do not retain it through fragile SSR hooks, hydration workarounds, or hydrating otherwise static content just to obtain styles. Make that decision in a small proof before migrating pages. CSS/SCSS remains an acceptable alternative; broad aesthetic styling cleanup is a separate project.

## What was inspected

The website's Gatsby configuration, page creation/schema modules, all route families, representative React components and hooks, styles, media handling, UI tests, public assets, and preview deployment/authentication code were inspected. The adjacent `cms.aascmed.com` Strapi schemas and preview configuration, and `api.aascmed.com` contact API/CORS configuration, were also inspected.

The final source review includes the media-slot refactors and UI tests present at website commit `d47478a`. Recheck the current branch before implementation because other work may continue. Existing local edits were left intact.

This is a source-based plan, not a production audit. Live Netlify configuration, deployed Strapi version/settings, API permissions, Cloudflare rules, current webhook registrations, and preview host capacity remain to be verified. No deployment or CMS content changes were made. `yarn typecheck` was run and currently fails; those failures are separate maintenance work, recorded below. No full Gatsby build or browser suite was run for this planning task.

### Current building blocks

| Area | Existing implementation | Migration implication |
| --- | --- | --- |
| Framework | Gatsby 5, React 18, TypeScript; Emotion `css`, `Global`, and theme helpers | Keep React; replace Gatsby integration and prove the styling/runtime combination. |
| Content | `gatsby-config.ts`: six collections and ten single types through `gatsby-source-strapi` | Replace the local Gatsby GraphQL graph with a server-only Strapi REST client and typed view models. |
| CMS | Adjacent CMS pins Strapi 5.38.0; all 16 sourced types enable Draft & Publish | Use Strapi 5 response shapes, `documentId`, and explicit publication status. No CMS major upgrade is required. |
| Routes | Nine files under `src/pages` including 404, plus five templates | Thin Astro routes can reuse extracted React page views. |
| Shared queries | Announcement, clinic options, site metadata, analytics IDs, share URL | Lift fetching/configuration out of components; pass props or a provider within one React tree. |
| Images | Gatsby image queries and local files; current reusable media components mostly accept `ReactNode` image slots | Preserve those slots. Replace image preparation/rendering at page boundaries. |
| Social images | `gatsby/create-pages.js` and `gatsby/og-image-generator.js` generate blog, condition, and clinic OG images | Extract generation from Gatsby; preserve public output independently of preview startup. |
| Preview | `gatsby develop`, refresh webhook, Podman Compose, Caddy, Express forward-auth | Retain the proxy/auth boundary; replace the application container and deployment lifecycle. |
| Public deployment | README identifies Netlify; `static/_redirects` and `static/_headers` carry hosting behavior | Verify live settings and preserve redirects, headers, canonical host, and atomic deployment/rollback. |
| Verification | `playwright.config.js`, `tests/ui/routes.json`, `tests/ui/media.spec.js` | Reuse route/visual coverage, adapting Gatsby-specific readiness and image selectors. |

Collections: blog, clinic, condition, provider, service-update, review. Single types: announcement, blog-archive, conditions-archive, clinics-archive, contact, providers-page, service-update-page, privacy-policy, home-page, tracking-info.

## Proposed architecture

```text
Published Strapi content -> build-time loaders -> shared view models
                                              -> Astro + React -> static CDN deployment

Browser -> Caddy -> existing forward-auth -> compiled Astro Node SSR
                                              -> request-time draft loaders
                                              -> the same view models and React views

Contact forms -> existing FastAPI contact endpoint
```

### 1. A content layer independent of either framework

Introduce shared content contracts and pure mapping functions, plus two temporary adapters:

- A Gatsby adapter translates existing query results into the contracts while Gatsby remains live.
- A Strapi adapter translates REST responses into the same contracts for Astro.

Components should receive the fields they display: titles, URLs, blocks, hours, summaries, image descriptors, and site settings. They should not receive Gatsby `Node` objects, `Queries.*` types, `localFile` trees, API tokens, or entire unfiltered CMS records.

Remove `internal.content` JSON parsing from shared UI. That is a Gatsby representation; Strapi REST provides blocks and dynamic zones as structured data. Preserve the existing BlocksRenderer, FAQ/CTA behavior, excerpts, and table-of-contents logic. The dynamic-zone renderer already understands both `__component` and Gatsby's `strapi_component`, which helps the transition.

The REST implementation must:

- Explicitly request `status=published` for public builds and `status=draft` for preview. The installed Gatsby source plugin currently translates preview requests to Strapi 5's draft status; reproduce that behavior deliberately. [Strapi status documentation](https://docs.strapi.io/cms/api/rest/status)
- Handle flattened Strapi 5 responses and stable `documentId` identity; do not substitute numeric IDs or Gatsby IDs for document identity. [Strapi REST response model](https://docs.strapi.io/cms/api/rest/)
- Centralize population per content type: clinic nested opening/shot hours; provider name, image, retirement notice and body; condition FAQ questions; homepage section media; and all dynamic-zone variants. `populate=*` is not recursive population. Validate representative responses against the deployed CMS. [Strapi population documentation](https://docs.strapi.io/cms/api/rest/populate-select)
- Fetch every page of collections. The CMS repository configures a default of 25 and maximum of 100 per REST page; Gatsby's configured `queryLimit: 1000` is not a suitable replacement for pagination.
- Preserve sorting and display limits: conditions/providers by `order`, blogs/updates by descending date, homepage limits of 11 conditions, 3 updates, and 6 blogs. Preserve retired-provider filtering on the homepage and retirement handling elsewhere.
- Use bounded concurrent requests, timeouts, useful error reporting, and request-scoped deduplication. Avoid fetching the full website for each detail-page request.
- Distinguish a missing record from CMS failure: unknown URL returns 404; upstream failure returns an appropriate error, not a misleading 404 or an empty successful page. A failed public build must leave the previous deployment live.
- Tolerate incomplete drafts with explicit placeholders/omitted optional sections. Validate published content sufficiently to avoid deploying malformed routes or silently dropping pages.

For static builds, reuse one bounded content snapshot across route enumeration and rendering where practical. Keep that snapshot in the build workspace, never in the public output. Reconcile content updates that arrive during a build with a subsequent build.

### 2. Shared React presentation, thin Astro entry points

Extract page JSX into `src/views/`, keeping components under `src/components/`. Leave Gatsby query exports and `Head` wrappers in their existing entry points until cutover. Astro entry points fetch data, prepare serializable props, supply metadata, and render the same views.

Start the compatibility proof with one SSR-rendered, hydrated React page tree. This preserves existing React composition and context with minimal change. It is a migration bridge, not a promise of reduced public JavaScript. Subsequently split clean boundaries such as navigation, contact forms, carousels, maps, booking widgets, announcement dismissal, and table-of-contents behavior into islands where useful.

Do not assume hooks run in React components rendered without a client directive. Do not assume React context crosses independent islands. Astro-to-hydrated-React props must be serializable: construct existing `ReactNode` media slots **inside the React view**, using plain image descriptors passed from Astro, rather than trying to serialize React elements, callbacks, or Emotion objects.

Prefer normal document navigation initially. Replace Gatsby `Link` with a small shared link API or anchors, preserving active navigation styling, `aria-current`, fragment links, and external links. Adding Astro client-side navigation is optional later work because it changes third-party script and widget lifecycles.

### 3. Styling decision: prove the fit, avoid a blanket rewrite

The repository uses Emotion throughout, including global styles, shared JS tokens, responsive helper objects, parent/child selectors, and styles derived from state. This is substantial reuse value, but the integration must be maintainable.

The early proof should include the real header/hero, a two-column layout, global styles, and an interactive element in both static output and compiled SSR. Configure the Emotion JSX runtime consistently in both builds, then test first-paint styles with JavaScript disabled, hydration, style ordering, repeated requests, and multiple islands. Pin compatible Astro/React integration versions; current integration documentation has version-specific compiler changes, so do not copy an old Babel setup indiscriminately. [Astro React integration](https://docs.astro.build/en/guides/integrations-guide/react/)

There is a specific selector concern: Emotion's default SSR inserts style elements into markup and documents limitations for structural selectors. This project uses `:nth-child(2)` in `layouts/half-columns.tsx` and first/last-child selectors elsewhere. Verify actual output. A local explicit column class may be preferable to a bespoke critical-CSS extraction system. [Emotion SSR behavior](https://emotion.sh/docs/ssr)

Decision gate:

| Result of proof | Recommended response |
| --- | --- |
| Standard integration gives correct SSR styles and stable hydration | Retain Emotion. Make only small compatibility changes. |
| A few structural selectors/global rules create problems | Move or rewrite those rules locally; keep Emotion where it fits. |
| Correctness requires custom renderer hooks, fragile extraction, duplicated style pipelines, or unnecessary hydration | Prefer CSS Modules/plain CSS or SCSS for the affected components; consider a wider conversion if the issue is systemic. |

If conversion is chosen, do it in small Gatsby-compatible changes before porting those components: preserve token values, specificity, breakpoints, DOM structure, motion, and accessibility. Use classes/data attributes for finite states and CSS custom properties for numeric values. SCSS is useful for nesting and breakpoint mixins; it is not required just because Astro is being adopted. Shared CSS imported by React components must not rely on Astro scoped selectors reaching inside React output.

No redesign, token renaming campaign, or wholesale style organization cleanup is included. Only tidy code where needed to establish a clear rendering boundary. Reassess effort after the proof; a broad CSS conversion materially expands scope.

### 4. Media and generated assets

Keep the newly established image slots in `Hero`, thumbnail/archive components, provider summaries, and `SectionMedia`. They already reduce the required component refactor. Remaining Gatsby image construction lives mainly in pages/templates; `.gatsby-image-wrapper` selectors still need replacement or a neutral wrapper class.

Introduce a small React image renderer receiving a serializable descriptor such as source URLs, responsive sources, width/height, alt text, loading priority, crop, and fit. Astro's `<Image>` cannot simply be imported into TSX. Its server-side `getImage()` can prepare URLs for a React renderer. [Astro images and framework components](https://docs.astro.build/en/guides/images/)

Recommended media policy:

- Public builds generate optimized responsive images ahead of deployment, keeping delivered pages/assets independent of live CMS requests where currently possible.
- Preview initially uses available Strapi image formats/originals with dimensions and the same crop/layout semantics. Avoid downloading and processing the complete media library at startup. Add bounded on-demand optimization only if measurements justify it.
- Retain hero eager loading, decorative alt text, provider portrait crops, the blog card crop, video controls, carousel sizing, and no-JavaScript media visibility.
- Handle relative/absolute Strapi media URLs centrally. Restrict any server-side remote-image fetcher to the expected media hosts; do not expose an unrestricted fetch endpoint.
- Preserve `/assets/` paths, patient PDFs, favicons, sprite fragments, and static-map fallbacks. Give SVG sprite imports explicit URL semantics compatible with both bundlers.

Extract OG rendering into a framework-independent server/build utility. Replace Gatsby cache and `public/` assumptions with explicit output/cache directories. Preserve existing public OG URLs where possible, or retain compatibility assets/redirects. Include content/media changes in cache keys, supply deterministic font assets, and handle absent thumbnails. Public builds continue generating blog, condition, and clinic map social cards. Preview may initially use a documented fallback image rather than running canvas/font/map downloads on every request; generating draft-specific social cards can follow if editorial review requires it.

### 5. Preview and environment boundaries

Use the Node adapter's compiled server entry point with production runtime settings. Do not replace `gatsby develop` with `astro dev` or the `astro preview` CLI. The adapter supports a standalone server behind the existing HTTPS proxy. [Astro Node adapter](https://docs.astro.build/en/guides/integrations-guide/node/)

Keep Caddy and the current administrator login flow initially. The source uses `/admin/login` and `/admin/users/me`; authentication redesign is not required for this migration. The SSR process should be reachable only through the protected internal network. Separate the administrator session cookie from the server-side content-fetching token.

Preview requirements:

- Fetch saved drafts at request time, including newly created documents that did not exist when the application image was built.
- Enforce preview mode through server deployment configuration, not a public query string or a browser-controlled flag. Never put the Strapi token in client props, JavaScript, URLs, or logs.
- Apply `Cache-Control: private, no-store` to draft-bearing HTML/data/derived assets and bypass Cloudflare caching for those routes. Set `X-Robots-Tag: noindex, nofollow` and an appropriate preview robots policy. Keep all draft-rendering endpoints behind authentication.
- Preserve iframe support, login redirects, logout, and direct deep links. Test cross-site cookie restrictions against the actual CMS hostname; a direct preview tab remains a useful fallback.
- Replace the Gatsby-specific refresh dependency. Keep `/__refresh` only while the old preview still requires it; remove its webhook registration and proxy bypass after rollback support expires. Public publish-triggered builds are a separate webhook concern and must continue.
- Verify the Strapi preview message protocol before keeping the existing `strapiUpdate` listener; validate origin/source and enable it only in preview. Saved-draft preview is the baseline. Unsaved live editing is not assumed.
- Update both CMS environment `admin.ts` files. They currently choose preview/public hosts by status but fetch a document without forwarding status/locale; make preview URL resolution use the requested version. Test changed slugs and date-based routes. For a draft lacking a usable slug/date, provide an authenticated document-ID preview route or an explicit editor-facing explanation, never an accidental `/undefined` URL.
- Read secrets at runtime in SSR, while treating client-visible API/Mapbox settings as intentional public configuration with documented build-time behavior. Replace Gatsby's environment naming through one config module. [Astro environment variables](https://docs.astro.build/en/guides/environment-variables/)

SSR removes the Gatsby development build/refresh bottleneck, but Strapi and authentication latency remain on the request path. Measure cold startup, memory, p50/p95 response time, and save-to-preview freshness on the actual host. Do not promise a speed multiplier before measuring.

## Component changes and reuse

| Files/area | Required change | Reuse expectation |
| --- | --- | --- |
| `src/pages/*`, `src/templates/*` | Extract React views; move queries, metadata, URL context, and image preparation into adapters/entry points | Most JSX and layout composition retained; substantial boundary work. |
| `AnnouncementBanner.tsx`, `contact/index.tsx`, `social-media/share.tsx`, `hooks/useSiteMetadata.ts`, `hooks/useAnalyticsIDs.ts` | Remove `useStaticQuery`; inject normalized data/config | UI and form behavior largely retained. |
| `layouts/app.tsx`, `layouts/default.tsx`, other layouts | Separate document/head duties from React layout and interactive shell; preserve global styles | Moderate refactor, dependent on styling proof. |
| `seo/index.tsx` and page `Head` exports | Build metadata in Astro's document head; remove Gatsby title-sync workaround; centralize canonical/absolute image URLs | Reuse metadata rules, replace integration. Preserve clinic JSON-LD and per-page social types. |
| Navigation, breadcrumbs, footer, archive links, shortcode links, contents | Replace Gatsby links and pathname assumptions | Mostly mechanical changes, with active/fragment behavior checks. |
| Media slots and image-producing pages/templates | Add neutral image descriptors/renderer; preserve slots and sizing | Reuse presentational components; replace image pipeline. |
| `mapbox/dynamic.tsx`, `mapbox/static.tsx` | Isolate browser initialization, environment access and cleanup; preserve SSR static fallback | Retain map behavior; defer heavy browser code where feasible. |
| Contact, Zocdoc, hero parallax, notices, reviews, SectionMedia carousels, contents/share | Deliberate hydration boundaries and browser API lifecycle | Retain React interactions; do not accidentally render them inert. |
| Buttons, headings, tables, containers, form controls, FAQ/blocks, excerpts/TOC utilities | Remove indirect framework dependencies where needed | High reuse, conditional styling adjustments only. |
| `gatsby/create-pages.js`, schema customization, image generator | Replace route enumeration/content schema and extract OG generation | Gatsby orchestration retired; reusable image logic retained. |

## Route and behavior contract

| Route family | Target |
| --- | --- |
| `/`, `/blog/`, `/clinics/`, `/conditions/`, `/providers/`, `/service-updates/`, `/contact/`, `/privacy/` | Matching Astro entry points. |
| `/blog/:slug/`, `/conditions/:slug/`, `/providers/:slug/`, `/clinics/:slug/` | Static paths from published records; request-time lookup in preview. |
| `/service-updates/:year/:month/:slug/` | One shared URL function, with year/month validated against the record. |
| Unknown paths and existing 404 asset | Real 404 behavior on both hosting targets; retain `/404.html` compatibility as needed. |
| Legacy redirects and `/assets/*` | Preserve current public URLs and status behavior. |

Use a captured route manifest as the compatibility contract. Share path generation between listings, detail pages, metadata, sitemap, and CMS preview configuration (or maintain identical contract fixtures across the two repositories). Standardize trailing slashes and date interpretation without silently changing existing URLs. Pay particular attention to clinic slug fallbacks, service-update month boundaries, and legacy PHP redirects.

Preserve canonical host, titles/descriptions, structured data, fonts, favicon paths, sitemap coverage, contact payload/error handling, and analytics behavior. Preview/staging should suppress tracking and use mocked/test form submission; test production tracking separately. Normal document navigation must not duplicate booking embeds or analytics initialization.

## Incremental delivery without planned downtime

### Phase 0 — Establish contracts and deployment facts

Capture a matching Gatsby/CMS content baseline, published route inventory, screenshots, critical metadata, and preview performance. Verify Netlify build/output settings, production build webhooks, Strapi token access/population, public media hosting, and available preview host memory.

Reuse the existing Playwright suite, but replace its Gatsby `onInitialClientRender` readiness check and `img[data-main-image]` assumptions with observable framework-independent readiness/image checks. Keep a fixed reference deployment or matched content snapshot so CMS edits do not create false visual regressions. Add separate checks for booking because the current visual suite blocks Zocdoc.

Exit: known current behavior, reproducible reference data, deployment/rollback inventory, and agreed performance budgets. Existing bug fixes may proceed independently.

### Phase 1 — Prove Astro, React, styles, and media together

Add an isolated Astro application under `astro/`, using shared source and an explicitly compatible dependency set. Prove one representative page with draft fetching, a real image, Emotion styling, and interaction in both static and compiled Node SSR output. Decide the styling strategy using the gate above and record exact package/runtime versions.

Keep Gatsby commands and deployment defaults unchanged. Use separate TypeScript/build scopes and outputs. A useful layout is Astro source under `astro/src`, existing `static/` configured as its public input, and separate `dist/astro-static` / `dist/astro-preview` outputs. **Do not use Gatsby's generated `public/` as Astro source assets**: it is ignored build output today. Avoid installing a second conflicting React copy or changing the shared lockfile without validating Gatsby.

Exit: the architecture fits without hacks; production SSR starts without fetching/building the whole content graph; style/media/hydration proof passes. If a supported compatible dependency set cannot coexist, isolate the Astro package while preserving a single compatible React runtime for shared components.

### Phase 2 — Prepare shared boundaries while Gatsby stays live

Introduce content/view-model contracts, path helpers, explicit site settings, and framework-neutral links/media boundaries. Remove static queries from reusable components through Gatsby-specific wrapper/container components. Extract React page views in small groups; retain Gatsby data queries and head generation in entry points.

If the styling proof requires CSS changes, make them here in small visually verified increments. Preserve the existing image-slot improvements rather than redo them. Each change should be independently deployable under Gatsby.

Exit: shared components/views used by Astro have no Gatsby runtime imports; Gatsby output remains equivalent. GraphQL and Gatsby-generated types remain confined to temporary Gatsby adapters.

### Phase 3 — Implement the Strapi loaders and all Astro routes

Implement REST population, pagination, publication modes, draft validation, error handling, and view-model mapping. Migrate route groups in this order: simple content pages; archives and blog/condition/provider detail pages; clinics and dated updates; homepage composition. Build SEO, sitemap, redirects, public assets, fonts, and public OG generation alongside the relevant route groups.

Use the same route source for static production and SSR preview, with separate build configuration selecting rendering mode. Prove static path enumeration is not consulted for SSR draft requests. The public build must never enumerate drafts.

Exit: every route family works in both modes, fresh draft slugs work without an application build, and content/visual/metadata parity passes against the baseline.

### Phase 4 — Run Astro preview beside Gatsby preview

Deploy an additional Astro SSR container on the private network and expose a protected candidate hostname or controlled proxy route. Keep Gatsby preview running. Build immutable images in CI; provide separate liveness and dependency-readiness checks, bounded upstream timeouts, resource measurements, and sanitized logs.

Test login/expiry/logout, CMS iframe use, new/changed/deleted drafts, publishing/unpublishing, incomplete content, assets, maps, forms, and content refresh without rebuilding. Test CMS/auth outages and verify no draft data is anonymously accessible or cached publicly.

When ready, reload Caddy to switch the preview upstream while both containers are healthy; retain the same established preview hostname. Changing a test preview host first may require CMS allowed-origin configuration. Do not use the current workflow's `--force-recreate` of the whole stack as a zero-downtime rollout mechanism.

Exit: editors use Astro preview successfully and measured startup/freshness/reliability improve. Rollback is a proxy switch to the retained Gatsby preview. Keep its refresh wiring functional throughout this rollback window.

### Phase 5 — Cut over the public static site

Build Astro against published content and deploy a candidate artifact with the intended production canonical configuration. Run the route/redirect/metadata/image checks and browser suite against the actual hosting environment, not only a local static server. Verify publish, unpublish, and delete events trigger a complete replacement build; publishing during a build must queue another build, and older builds must not overwrite newer ones.

Promote the verified artifact atomically on the existing public hosting, preserving domains and redirects. Retain the previous Gatsby deployment and the documented build configuration needed to restore it. No CMS schema migration or content freeze is required; keep schema changes backward-compatible while both renderers exist.

Exit: production route and interaction checks pass, build hooks work, no draft leakage, and no material performance regression. If deployment checks fail, restore the previous immutable deployment rather than rebuilding in an incident. Published content changes since that artifact can temporarily lag after rollback; document and reconcile them.

### Phase 6 — Remove Gatsby after a successful observation period

After an agreed observation period (proposed: one week including an editor publishing cycle), remove Gatsby dependencies, GraphQL wrappers/generated types, schema customization, old preview image/workflow paths, refresh webhook/token, and obsolete caches. Keep rollback artifacts until the agreed retention period ends. Simplify scripts and docs; verify the cleaned install, static build, SSR build, types, and browser tests once more.

Island refinement and broad styling cleanup can then be separate improvements. They are not prerequisites for replacing the preview development server.

## Migration risks and how to contain them

| Risk introduced/exposed by migration | Containment |
| --- | --- |
| REST data is not Gatsby's normalized graph | Shared view models, explicit population, fixtures for every content type, pagination and draft/published tests. |
| Emotion works in React but fits Astro SSR/islands poorly | Early real-component proof; prefer localized CSS changes or conversion over custom rendering machinery. |
| React renders HTML but interactions are not hydrated | Explicit hydration inventory and behavioral tests; start with a complete React tree where helpful. |
| Server/client props differ or contain nonserializable values | Plain data at Astro boundaries; create React nodes inside React; deterministic first render and post-mount browser state. |
| Images look different despite equivalent content | Preserve aspect ratios, wrappers, eager/lazy loading, alt semantics, video behavior and responsive crops; visual tests. |
| Removing Gatsby removes implicit build features | Explicit replacements for sitemap, fonts, image processing, metadata, OG generation, static assets and redirects. |
| Changed routing/date behavior loses existing URLs | Shared path contracts and manifest comparison, including incorrect dates, clinic fallback names, and historical redirects. |
| Runtime fetching increases preview dependence on CMS/auth | Timeouts, bounded concurrency, measured latency/load, clear failures; public site remains static. |
| Drafts leak through caches, assets, or misconfigured modes | Separate deployments/tokens where possible, server-enforced mode, no-store/bypass rules and anonymous-access tests. |
| Native image/canvas dependencies behave differently in the new container/runtime | Pin and build the chosen runtime image; exercise real image/OG generation in CI. Avoid Edge-runtime assumptions. |
| Hosting config or third-party integrations differ from local behavior | Actual-host smoke tests for CORS, iframe cookies, Mapbox restrictions, CSP, redirects, booking and analytics. |

## Completion criteria

- All existing published routes and legacy redirects remain reachable with correct status codes and canonical metadata; missing content produces real 404s.
- Shared UI has no Gatsby data/runtime dependency; Strapi remains the content source with no migration-related content/schema rewrite.
- Public output includes only published content; drafts, private tokens and server configuration do not appear in public artifacts.
- A newly saved draft or changed slug is visible in authenticated preview after reload, without rebuilding/restarting the application or calling Gatsby refresh.
- Navigation, mobile menu, contact forms, booking, maps, carousels, notices, anchor links, media and patient PDFs retain their behavior on desktop and mobile.
- Static and SSR output are styled before hydration; there are no hydration warnings, missing content with JavaScript disabled, or unbounded style accumulation across requests.
- Preview performance is measured against Gatsby on comparable hardware/content; proposed initial operational targets are application readiness within 10 seconds without bulk CMS/media work, and saved content visible on the next reload. Final response-time/memory budgets are set from Phase 0 measurements.
- A failed build leaves the previous public site live; preview and production rollback procedures are exercised before removing Gatsby.

## Existing bugs: separate work, already filed

These are existing defects, not Astro migration snags. They can be fixed by another agent independently. Three tickets were created in Kaneo's Website Development project, assigned to Salman Khan:

| Ticket | Scope |
| --- | --- |
| WEB-8 | Fix inconsistent `GATBSY_API_BASE_URL` / `GATSBY_API_BASE_URL` naming and verify configured contact requests without sending real email. |
| WEB-9 | Correct preview authentication documentation to match the existing Strapi administrator login implementation. |
| WEB-10 | Restore `yarn typecheck`, starting with React runtime/type alignment and the observed component typing failures. |

The migration should consume those fixes rather than duplicate them. It must not be credited with fixing pre-existing issues or use them as evidence that Astro is inherently more reliable.

## Approval and Kaneo delivery

Approval establishes the two-deployment architecture, shared React/view-model approach, preview-first rollout, and early styling decision gate. Emotion has a slight preference, but architectural fit takes precedence; a broad conversion should be reflected in an updated scope before implementation proceeds.

Kaneo delivery is organized into an overall migration tracker, stage parents, and focused implementation tasks assigned to Salman Khan. See [the ticket and dependency index](astro-migration-tickets.md) for the saved hierarchy and delegation rules. Each implementation ticket contains the relevant repository/files, a short scope, concrete acceptance checks, and prerequisites. Architecture decisions belong in the initial proof; subsequent route/component tickets should reuse its decisions rather than rediscover the design.

Keep the three existing-bug tickets separate from that epic. Exclude CMS upgrades, contact backend rewrites, visual redesign, authentication redesign, and general style cleanup unless separately approved.
