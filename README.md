<div style="text-align: center" align="center">
   <div style="width: 10em; height: auto; margin: 1rem auto;" >
      <img src="https://aascmed.com/assets/favicon/favicon.svg" alt="Allergy, Asthma and Sinus Centers Logo" width="50%" />
   </div>
  
  # Allergy, Asthma and Sinus Centers Website
  [![Netlify Status](https://api.netlify.com/api/v1/badges/8aff015c-4beb-4c18-968b-e8bb93ab42b5/deploy-status)](https://app.netlify.com/sites/aascmed/deploys)
  [![Deploy Preview Server](https://github.com/m-salmankhan/aascmed.com/actions/workflows/deploy-preview.yml/badge.svg)](https://github.com/m-salmankhan/aascmed.com/actions/workflows/deploy-preview.yml)
</div>

## Development Instructions

Coming soon&trade;

## UI regression tests

Run `yarn playwright install chromium` once, build with `yarn build`, and serve
with `yarn serve --port 9000`. In another terminal, run `yarn test:ui`.
Set `UI_BASE_URL` to test a deployed candidate instead; `UI_REFERENCE_URL`
defaults to the production site and can point to a pinned baseline deployment.
Both URLs must serve the same CMS content for a meaningful comparison.
For refactors, build the base commit and candidate with the same CMS snapshot
and set `UI_REFERENCE_URL` to the base build. Verify that every page's
`public/page-data/**/page-data.json` has identical `result.data` before comparing:
fresh CMS builds can otherwise differ from an older deployed site's content.

The Chromium suite checks desktop (1440px) and mobile (390px) hero coverage,
image accessibility/loading behavior, and full-page visual parity for the
every published route (all five dynamic templates, all static pages, and the
404 page). A sitemap assertion prevents newly published pages from silently
missing coverage; update `tests/ui/routes.json` when content routes change.
It also exercises thumbnail hover/focus/click and responsive navigation.
It waits for Gatsby's initial-client-render performance marker before interacting
with hydrated controls, waits for fonts and remeasures responsive content,
resets scrolling instantly before captures, and excludes third-party
booking/deploy-preview widgets. Live Mapbox WebGL tiles are masked, but map
dimensions, surrounding layout and controls are compared. It waits for lazy images and allows at
most 0.1% differing pixels (with a 0.1 per-pixel color threshold to ignore
antialiasing). Production, candidate, and difference screenshots are attached
to the HTML report. Open it with `yarn playwright show-report`.
