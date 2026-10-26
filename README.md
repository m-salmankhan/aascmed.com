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

See [the regression testing guide](tests/README.md) for coverage, safety,
matched-content baselines, local commands, CI/manual triggers, advisory reports,
and the limits of external-service testing.

`yarn test:infrastructure` runs fast, isolated checks on every pull request.
`yarn test:ui` runs the complete desktop/mobile website comparison and behavior
suite against explicit `UI_BASE_URL` and `UI_REFERENCE_URL` deployments.
The longer website suite is available through the **Regression tests** workflow's
**Run workflow** button; it requires a retained reference with matching CMS content.
Reference differences do not fail CI: the manual run posts a resolvable PR review
conversation with report links. Functional and harness failures still fail.
Supply the PR number and select its current branch/head when dispatching.
