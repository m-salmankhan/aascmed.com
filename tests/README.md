# Website regression testing

## What this protects

The original image-refactor checks are retained and expanded, not presented as
complete website coverage. No performance budget is enforced.

| Layer | Checks | What a failure means |
| --- | --- | --- |
| Route inventory | Both deployments' sitemap indexes and every child sitemap must match `ui/routes.json`, without duplicates. | A route was lost/added, a sitemap broke, or the content inventory needs an intentional update. |
| Every-route contract (advisory) | Page title, canonical URL, language, description, robots, Open Graph/Twitter tags, parsed JSON-LD, main text, heading hierarchy/IDs, navigation/main/footer link destinations, form field types/requirements/options. | Review content, SEO, navigation or form-structure differences from the reference. JSON attachments show what changed; differences alone do not fail CI. |
| Every-route appearance (advisory) | Full-page Chromium screenshots at desktop 1440x1000 and mobile 390x844; image alt/loading/draggable semantics; live map canvas dimensions. | Review layout, text, imagery, accessibility semantics or responsive styling differences. Broken image loading still fails page readiness. |
| Image behavior | Hero bounds at scroll 0/250, eager loading, non-draggable hero; condition-card hover, keyboard focus and Enter navigation. | A media slot, overlay or hero regressed. |
| Functional journeys | Responsive menu open/close/keyboard navigation and history; all five archive-to-detail families; article contents targets; review-carousel next/back; missing-page HTTP 404 and home link; core content/fallback navigation with JavaScript disabled. | Hydration, routing, anchor IDs, carousel controls or fallback routing broke. |
| Contact | Native required validation; exact synthetic payload/success on contact, home and clinic pages (including the fixed clinic field); field errors preserving input and successful retry; server-error notice rather than false success. | The form's client-side state machine or request contract broke. No email is sent. |
| Integration smoke | Booking script request, keyboard dismissal, Zocdoc handoff URL; real Mapbox initialization, nonzero canvas dimensions, marker click and clinic popup. | The website's integration boundary stopped working. This does not verify a completed external appointment or live map-tile accuracy. |
| Infrastructure self-tests | Route/target validation, visual threshold and dimensions; Gatsby-free readiness; deliberate content/image/background/layout changes; malformed JSON/PNG and blocked writes; PR comment formatting, clean/different/failed reports, stale PRs and API failures. | A change weakened the harness or its advisory-versus-failing policy. These tests need neither the CMS nor deployed sites; GitHub API calls are simulated. |

Current inventory: 65 routes (including 404), covering nine fixed routes and all
five dynamic page families. Each route is compared at both viewport sizes.
Route growth should fail the inventory assertion, not silently escape coverage.
The map test intentionally retains live Mapbox reads; unavailable/invalid Mapbox
credentials, network access or WebGL support fail this integration check.

## How the comparison works

`ui/helpers.js` uses HTML semantics and observable behavior, not Gatsby's
performance markers or `data-main-image`. It waits for document load, fonts,
layout remeasurement and successful keyboard interaction with the booking dismiss
control when present. Before pressing it, the helper waits for the booking
component's observable script insertion: the shared component performs that
insertion in its post-hydration effect, after event handlers are attached. This
avoids clicking an unhydrated button nested inside a booking link and accidentally
navigating away. A replacement booking integration must preserve this readiness
contract (or introduce an equivalent documented shared hook), not insert the
script during SSR before its controls are interactive.
It scrolls visible content images into view and waits for decoding
and lazy-map previews to disappear before returning to the top.
Actual navigation, form, carousel and map tests prove their own interactive
readiness. An Astro candidate needs the same public behavior/HTML contract, not
a Gatsby runtime or a test-specific framework adapter.

Both sides supply canonical SEO URLs unchanged. Only same-site link origins are
normalized for comparison so a localhost/preview origin does not cause false
link failures. Text whitespace is normalized; heading IDs, content order,
external URLs, metadata and form requirements are not masked.
JSON-LD is parsed, so object-key formatting does not matter and invalid JSON fails.
With JavaScript enabled, hidden `noscript` fallback markup is excluded from
main-content and link-label text contracts. A desktop/mobile fixture changes only
that fallback markup and verifies both contracts stay unchanged. The separate
JavaScript-disabled journey still exercises rendered fallback navigation.

Full-page screenshots flag more than **0.1% differing pixels** for review, using
pixelmatch's 0.1 per-pixel color threshold and default antialias handling.
Changed screenshot dimensions are also advisory: both screenshots and their
dimensions are retained, without attempting pixelmatch on incompatible images.
Only live Mapbox canvases are masked; map sizes, markers,
popups and surrounding layout remain covered. Reports attach reference/candidate
contract JSON, reference/candidate screenshots, pixel-difference images and
changed-pixel counts. Failed browser tests retain screenshots and traces.

`ui/comparison.js` records reference differences as `reference-difference`
annotations, not failed assertions. Intentional changes such as a red background
therefore leave the job green while retaining evidence for human review.
This is not `continue-on-error`: broken navigation/forms, route inventory,
HTTP/image-loading failures, malformed JSON-LD/PNG, unsafe writes and execution
errors still fail normally. Functional assertions must be updated explicitly
when their intended behavior changes.

## Safety and external services

The automatic context fixture blocks unhandled POST/PUT/PATCH/DELETE (and any
other non-read method), including requests from newly opened pages, and fails the
test with a sanitized method/URL. Explicit contact mocks intercept synthetic
submissions and return controlled API responses. Expected booking, analytics,
Mapbox telemetry and preview-widget requests are blocked without counting them as
unexpected submissions. No real contact API, email, appointment or CMS mutation
is allowed.

Booking smoke serves a tiny inert script and intercepts the outbound practice
URL. It verifies our script loader, dismissal and handoff, **not Zocdoc's popup
implementation, availability, authentication or appointment completion**.
Contact mocks verify our frontend and payload, **not server-side validation,
delivery, CORS or email**. Map smoke loads the real browser integration but does
not assert a particular tile or require a completed map-service transaction.

Do not use authenticated editorial drafts, patient data, private snapshots,
tokens or credentials in comparison URLs or workflow inputs. Reports include
page content and browser traces. This workflow targets public published content.
Preview authentication, draft isolation/freshness, hosting redirects/headers,
rollback/deployment settings and third-party end-to-end acceptance remain separate
migration gates, not claims made by this suite.

## Establish a matched baseline

1. Retain an immutable **reference build/deployment** from the base commit.
2. Build/deploy the candidate from the intended PR commit using the **same
   published CMS snapshot** (including media, menus, announcements and tracking
   configuration). Record base/candidate commits, deployment IDs and snapshot ID.
   Freeze CMS changes during capture or use an approved retained published-content
   export; do not commit private content or access tokens.
3. For Gatsby-to-Gatsby comparisons, additionally compare every generated
   `public/page-data/**/page-data.json`'s `result.data`. Gatsby's build-local File
   node IDs can depend on the absolute worktree path: normalize only confirmed
   File identifiers (such as serialized `localFile___NODE` and `heroImage.id`),
   never CMS document IDs or content differences. For Gatsby-to-Astro,
   use the matched source snapshot plus the framework-neutral DOM contracts.
4. Supply two different site-root origins (scheme, hostname and port). Normalized
   origin comparison rejects self-comparisons even with empty `?`/`#` suffixes,
   hostname casing differences or explicit default ports.
   The candidate base URL is resolved to `/` so accepted empty suffixes cannot
   cause false URL mismatches after home navigation. A configuration regression
   test loads the real Playwright config for these aliases and preserves
   non-default ports.
   Missing URLs, credentials in URLs,
   non-HTTP URLs and identical URLs fail configuration rather than silently
   comparing against live production or the candidate itself.
5. Run the suite and retain its provenance/report. Contract differences can identify
   mismatched content but are **not proof** that two independent CMS fetches used
   the same snapshot. Do not relax assertions to accommodate unrelated CMS edits.

The suite does not manufacture or embed an approved CMS baseline. WEB-13's
non-performance inventory/deployment work remains a prerequisite for accepting
the migration; the owner's request permits building this infrastructure now.
The local harness validation uses one generated Gatsby artifact and a retained
copy on a second server: that proves the unchanged-site control passes, not that
an Astro migration or an independently built candidate has achieved parity.

## Local commands

Install dependencies with `yarn install --frozen-lockfile` and browsers once
with `yarn playwright install chromium`. CI installs Chromium system dependencies
too. Node 22 and Yarn 1 are used by the workflow.

Fast, CMS-independent checks:

```text
yarn test:infrastructure
```

Build with `yarn build` and serve the candidate with `yarn serve --port 9000`;
serve the retained reference separately on port 9001. In PowerShell:

```powershell
$env:UI_BASE_URL = "http://localhost:9000/"
$env:UI_REFERENCE_URL = "http://localhost:9001/"
yarn test:ui
```

The same URLs can point to public deployments built with Gatsby or Astro.
`UI_SITEMAP_PATH` optionally overrides `/sitemap-index.xml` for **both** sites;
it can also identify a direct URL-set sitemap instead of an index.

Focused functional checks: `yarn test:smoke`. A single family/viewport:
`yarn test:ui --project=mobile --grep "contact"`.
Open the last HTML report with `yarn playwright show-report`.

## CI and runtime policy

[Regression tests](../.github/workflows/regression-tests.yml) runs
`yarn test:infrastructure` on every PR and push to main. The isolated checks
take roughly 30 seconds locally, excluding dependency/browser installation.
They protect the harness, **not a deployed PR's application behavior**.

The website suite is **on demand**, not a required network/CMS-heavy check on
every commit. A fresh Gatsby build alone took about 4 minutes locally; full-site
comparisons add multiple minutes, live fonts/maps and a reference deployment.
For a quick PR review, same-repository PRs get an instruction comment: after the
Netlify deploy preview for the current head is ready, comment `/run-regression`.
That run compares the PR's `deploy-preview-N--aascmed.netlify.app` deployment
with `main--aascmed.netlify.app`, after verifying that the PR targets current
`main` and that Netlify reported a successful preview for the exact head commit.
It records both commit SHAs, but the Netlify branch builds may have fetched
different published CMS snapshots, so this run is advisory and can include
content drift. Production is not used as the reference.

For a deterministic acceptance comparison, use the manual workflow below with
an immutable reference deployment and a matched CMS snapshot. The fast
infrastructure job remains separate from both browser comparison paths.

For an on-demand PR comparison, wait for the Netlify preview deployment to
succeed, then comment `/run-regression`. The workflow checks that the PR is open,
targets current `main`, comes from this repository, and has a successful Netlify
preview status for its current head commit. Only repository collaborators with
write access can trigger it. The workflow code runs from the default branch for
comment-triggered runs; it does not check out or execute PR code.

For a deterministic matched-content run, choose **Actions > Regression tests >
Run workflow**, select the branch containing the intended test code at the
current head of the intended open PR, then enter:

- `pull_request_number`: that PR's number; the job rejects closed PRs or a
  selected test-code commit that no longer matches the PR head;
- `candidate_url`: the deployed candidate from that PR commit;
- `reference_url`: the immutable reference built from matching content;
- `baseline_id`: base/candidate deployment or commit IDs and CMS snapshot ID.

Manual runs first execute the infrastructure gate, then the full website suite
(30-minute timeout). The run summary records URLs, baseline ID and test-code
commit; both jobs upload HTML reports and failure artifacts for 14 days even on
failure. The test-code branch does not build or deploy the candidate: verify its
deployment commit explicitly. No CMS/deployment secrets are needed by these jobs.

### Reviewing and accepting differences

After a browser comparison, `ci/review.js` reads the actual Playwright JSON report.
If reference differences exist, CI creates **one resolvable file-level PR review
conversation** listing affected pages/viewports and difference categories,
including changed-pixel counts or screenshot dimensions. It links the CI run and
downloadable report with reference/candidate/difference images and contract JSON.
Download and extract the artifact, then open its HTML report with
`yarn playwright show-report <extracted-playwright-report-directory>`.
Images are in the report, not embedded directly in the PR comment.

1. Review the differences. An intentional background/content/design change does
   not require weakening the tests or making the old and new sites identical.
2. Fix unexpected regressions, or **resolve the conversation** to acknowledge
   intentional differences. Each run with differences creates a fresh
   conversation; an older resolution does not approve later results.
3. Merge once functional checks and the rest of the PR review are satisfied.

Enable **Require conversation resolution before merging** in the main branch's
protection/ruleset if GitHub should enforce that acknowledgement. The workflow
does not change repository merge rules. Reference differences themselves never
turn the CI job red; resolving a conversation does not override functional
failures. Publishing/API failures, missing/empty reports and stale PR heads are
infrastructure errors and fail the job rather than silently omitting the review.
An unchanged comparison creates no conversation; its summary is still recorded
on the Actions run. A cancelled run is not an acceptance result.

Only browser runs and the same-repository PR instruction comment receive the
write permissions they need, using GitHub's built-in token. Automatic PR
infrastructure checks remain read-only. No Kaneo credential or external image
hosting is needed. Manual dispatch executes the selected branch's test code with
write permission, so run only trusted branches. Comment-triggered runs use the
default branch's test code and accept commands only from write collaborators on
same-repository PRs.

## Updating coverage

- Add published paths to `ui/routes.json` only after confirming the sitemap change
  is intentional on both matched builds.
- Add new user journeys to `ui/behavior.spec.js`; use the safety fixture and
  explicitly intercept any expected writes.
- Extend `pageContract` for a new stable semantic contract and add a deliberate
  mutation case to `infrastructure/browser.spec.js`.
- Keep volatile external content out of visual assertions only with a documented,
  narrow mask plus a separate integration smoke assertion.
- Do not hide changed screenshots by increasing the threshold or pointing both
  URLs to the same candidate. Review the contract and difference attachments.
