# Stage 3 Astro validation

The remaining Stage 3 implementation is submitted as six stacked review MRs over feature MR #145. No new MR has been merged and no deployment was performed. Stage 4 preview deployment and Gatsby retirement remain separate work.

## Matched content and builds

- Gatsby baseline: `5a03162b082a64ea502d0c172fcef433f842b47e` (`main`), built locally with development CMS settings.
- Astro application: `b1919bbb560768f137a7c1c49a61c8088425ea90`; later evidence commits contain documentation/images only.
- Both builds use the same 56 published detail records: 33 blogs, 10 conditions, 5 providers, 4 clinics and 4 service updates. Record IDs and `updatedAt` values were checked again after the Astro build; none changed.
- The version-set SHA-256 is `10a817ce55801fc68cbadca99020db68ced2ca54acbf7a2b7f0d7b495627093a`.
- Real Gatsby, Astro static and compiled Node SSR builds succeed. The static output has 65 pages, including the 404 asset. All 1,066 public files were scanned for the configured CMS token; none contain it.

## Validation

| Check | Result |
| --- | --- |
| Astro typecheck | 37 files, zero errors/warnings/hints |
| Source unit suite | 41 passed |
| Full actual static/SSR integration suite | 6 passed |
| Individual MR boundaries | WEB-32/33/34/35: 4 integration cases each; WEB-37: 5; all pass |
| Matched-content static browser suite | 176 passed, zero failed/flaky; all 130 screenshot dimensions match |
| Real SSR HTML comparison | All 64 published routes match static title, description, canonical and meaningful body text; the 404 response matches status/content but canonical follows the requested error URL |
| Real SSR image delivery | Cold homepage/conditions pass unchanged 10-second image waits; 12/12 real SSR desktop/mobile comparisons pass |

The synthetic CMS integration builds both actual Astro targets and verifies every fixed/archive/detail family without JavaScript, published-only sitemap dates/metadata, JSON-LD and public artifact isolation. The running SSR server sees newly created, edited, renamed and deleted drafts without rebuilding. Missing/wrong-date URLs return 404; incomplete draft profiles/homepage sections remain usable; CMS outages return 500 without leaking credentials. Browser input cannot switch publication mode. Preview responses disable tracking and carry private/no-store/noindex policy.

Interaction tests cover mobile navigation/current links, announcement dismissal and preloaded session storage, carousel controls, booking dismissal/handoff, maps, contents anchors and contact success/field/server errors. Forms use interception or a synthetic local HTTP endpoint; no real enquiry was submitted. A UTC server and Chicago browser retain the same November 1 service-update date and breadcrumb at the month boundary.

## Regressions resolved

Collection ties/defaults now retain Gatsby's numeric CMS source order; stable document identity still uses `documentId`. This restores condition cards, clinics/contact choices and the first review. Service-update date display and breadcrumbs preserve the stored calendar date across timezones.

Cold SSR testing also found that a 315px card could select a 6,584px AVIF: that transform took 39.4 seconds. Native image output is now bounded to 1,920px, skips unnecessary dimension inference when CMS dimensions exist, and uses the standard [lazy-image `sizes="auto"` selection](https://html.spec.whatwg.org/multipage/images.html#sizes-attributes) with a viewport fallback. The card selects 320px instead; measured slowest image requests were 1.06s on the homepage and 0.98s on conditions. Complete cold page/image preparation took 5.9s and 2.5s respectively. A real native-image fixture verifies a 3,000px source produces 1,920×1,280 output and bounded AVIF/WebP/JPEG candidates. Timeouts were not increased.

## Deliberate differences and limits

Semantic and pixel comparisons are advisory and were reviewed separately from functional pass counts. Remaining differences are explicit article/profile Open Graph types (the previous rendered Gatsby output used website), provider social images using their public CMS CDN URL, 404 canonical/noindex behavior, and the corrected explicit Crest Hill breadcrumb/JSON-LD URL. Six small pixel-threshold advisories remain across five routes; visual review found no corresponding layout or content defect. Native image encoders/source selection account for those differences; exact per-route results are in the [evidence JSON](screenshots/astro-stage3-evidence.json).

The public homepage omits legacy Netlify Identity login hooks. Authentication and deployment performance on the actual preview host belong to Stage 4. The test servers are local; this report does not claim a deployed preview, production cutover, or third-party analytics delivery.

## Reproduce

Install root/Astro dependencies and Chromium with the documented Node version in [Astro setup](../astro/README.md). Run `yarn test:unit`, `yarn --cwd astro typecheck` and `yarn test:astro`. The integration suite uses its own synthetic CMS and blocks external browser requests.

For matched-content comparisons, build Gatsby `main` and this Astro branch using the same development CMS version and public Runtime API/Mapbox settings. Configure `STRAPI_MEDIA_ORIGINS` from the upload origins returned by that CMS, then run `yarn astro:static --mode development` and `yarn astro:ssr:build --mode development`. Serve the Gatsby baseline and static Astro output on distinct loopback ports; run:

```sh
UI_BASE_URL=http://127.0.0.1:4330/ UI_REFERENCE_URL=http://127.0.0.1:4329/ yarn test:ui
```

Run the compiled Node SSR entry with the same server environment and repeat representative media comparisons against its port. `tests/ui` already protects against unintended write requests. Application builds may emit the existing navigation duplicate-case warnings; the navigation behavior checks pass.

## Screenshots

These are real development-content Astro pages, captured after image loading with booking bubbles dismissed. Maps are unmasked. They are committed so they can be viewed in the GitHub mobile app.

| Page | Evidence |
| --- | --- |
| Homepage desktop | [Viewport](screenshots/astro-stage3-home-desktop.png), [full page](screenshots/astro-stage3-home-desktop-full.png) |
| Homepage mobile | [Viewport](screenshots/astro-stage3-home-mobile.png), [full page](screenshots/astro-stage3-home-mobile-full.png) |
| Clinics archive desktop | [Full page](screenshots/astro-stage3-clinics-desktop.png) |
| Clinic detail mobile | [Full page](screenshots/astro-stage3-clinic-mobile.png) |
| Condition detail mobile | [Full page](screenshots/astro-stage3-condition-mobile.png) |
