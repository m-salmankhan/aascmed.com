<p align="center">
  <img src="static/assets/favicon/favicon.svg" alt="Allergy, Asthma and Sinus Centers logo" width="160" />
</p>

# Allergy, Asthma and Sinus Centers website

[![Netlify Status](https://api.netlify.com/api/v1/badges/8aff015c-4beb-4c18-968b-e8bb93ab42b5/deploy-status)](https://app.netlify.com/sites/aascmed/deploys)
[![Unit & integration tests](https://github.com/m-salmankhan/aascmed.com/actions/workflows/regression-tests.yml/badge.svg?branch=main&event=push)](https://github.com/m-salmankhan/aascmed.com/actions/workflows/regression-tests.yml?query=branch%3Amain+event%3Apush)

Source for [aascmed.com](https://www.aascmed.com), the public website for Allergy, Asthma and Sinus Centers. It provides clinic and provider information, conditions, articles, service updates, patient forms and contact options. Astro builds the site from Strapi content, with React components for interactive features and Netlify hosting.

## Repository layout

| Location | Contents |
| --- | --- |
| `src/pages`, `src/layouts` | Astro routes and page documents; see [page architecture](src/server/pages/README.md). |
| `src/components`, `src/views` | Shared React components and page views. |
| `src/content` | [Content models and validation](src/content/README.md). |
| `src/config`, `src/data`, `src/navigation` | Site configuration, browser contexts and navigation. |
| `src/server` | Server-only [CMS loaders](src/server/content/README.md), page mappings and [media generation](src/server/media/README.md). |
| `src/integrations` | Astro build integrations for images and sitemaps. |
| `static` | Public assets, patient PDFs, hosting headers and redirects. |
| `tests` | [Unit, integration and browser regression tests](tests/README.md). |
| `docs` | [Development, deployment and configuration guides](docs/README.md). |
| `plans` | Migration records and [future preview-platform work](plans/preview-platform-plan.md). |
| `netlify`, `.github/workflows` | Hosting build plugins and CI workflows. |
