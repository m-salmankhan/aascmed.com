# Isolated Astro build targets (WEB-21)

Astro lives in its own package and lockfile so Gatsby's root dependency resolution, commands, generated `public/`, and deployment defaults remain unchanged. Both targets use `static/` as their public asset directory, preserving ownership of `_headers`, `_redirects`, and existing files; Gatsby's generated output is never reused.

Pinned compatibility set: Astro 6.4.2, `@astrojs/react` 7.1.0, `@astrojs/node` 10.1.4, React/React DOM 18.3.1, and Node.js 22.23.4 (`astro/.node-version`). The Astro package uses a separate runtime floor so Gatsby remains independently runnable under its existing Node environment. React integration 7 removes its Babel option, which the later Emotion proof must account for.

**WEB-21 scaffold decision (historical):** the initial Astro package treated React 18 as a peer and expected a root install; its Vite targets deduplicated `react` and `react-dom`. That described the empty build scaffold before the styling and shared-component proof. The Astro check toolchain also needed `@emnapi/core` and `@emnapi/runtime` explicitly with Yarn 1; without them, its CLI prompted for an installation and exited without checking files.

## Final stage-1 package layout (WEB-22)

The proof makes Astro a self-contained package: `astro/package.json` now installs React and React DOM 18.3.1, Emotion 11.14.0, and the Astro toolchain under its own lockfile. Both Vite targets alias `react`, `react-dom`, and `@emotion/react` to those exact Astro-local packages and deduplicate them. Shared Gatsby-free source imports therefore resolve to the same React/Emotion copies within the Astro server render and hydrated client bundle; no second React instance is introduced into either Astro bundle. Gatsby continues to resolve its own root dependencies as before. This supersedes WEB-21's peer-resolution assumption for the completed stage-1 layout without changing that commit's scaffold history.

Astro's local React type packages match the root Gatsby package's React 19 type versions while both renderers run React 18. After installing both packages, this avoids incompatible JSX types when Astro checks TSX imported from the shared `src/` tree.

Install each package from its own directory/lockfile: root `yarn install --frozen-lockfile` for Gatsby, and `yarn --cwd astro install --frozen-lockfile` for Astro. Astro candidate packaging must include its installed production dependencies rather than depend on the Gatsby root `node_modules` tree. The Vite aliases are defined in both Astro configs so static and compiled SSR builds use the same runtime boundary. The React integration sets `jsxImportSource: '@emotion/react'` for the standard Emotion JSX runtime.

Commands from repository root:

- `yarn astro:static` writes `astro/dist-static/`.
- `yarn astro:ssr:build` writes a compiled standalone server to `astro/dist-ssr/`.
- `yarn astro:ssr:start` starts that compiled server (after the SSR build).
- `yarn --cwd astro typecheck` checks the isolated Astro TS boundary.

The root Gatsby `develop`, `start`, `build`, `serve`, `clean`, and `typecheck` commands are preserved. WEB-21 initially proved only build target isolation and server startup. WEB-22 now proves representative React styling, hydration, media, and a bounded request-time draft read; full route parity belongs to later tickets.

Validation on 26 October 2026: both Astro builds completed, the static HTML identified the static target, the compiled Node server returned the SSR target, and `yarn --cwd astro typecheck` reported zero errors, warnings, and hints. The WEB-22 mock proof verified changing drafts, fallbacks, and stable SSR styles. Playwright confirmed computed styles with JavaScript disabled and two hydrated islands without console or hydration errors. A CMS-configured Gatsby build generated all 66 pages and fresh query declarations successfully; `yarn typecheck` and four focused desktop/mobile menu and no-JavaScript Gatsby checks passed on that output.
