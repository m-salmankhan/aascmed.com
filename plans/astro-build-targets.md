# Isolated Astro build targets (WEB-21)

Astro lives in its own package and lockfile so Gatsby's root dependency resolution, commands, generated `public/`, and deployment defaults remain unchanged. Both targets use `static/` as their public asset directory, preserving ownership of `_headers`, `_redirects`, and existing files; Gatsby's generated output is never reused.

Pinned compatibility set: Astro 6.4.2, `@astrojs/react` 7.1.0, `@astrojs/node` 10.1.4, React/React DOM 18.3.1, and Node.js 22.23.4 (`astro/.node-version`). The Astro package uses a separate runtime floor so Gatsby remains independently runnable under its existing Node environment. React integration 7 removes its Babel option, which the later Emotion proof must account for.

Install the root Gatsby dependencies first (`yarn install --frozen-lockfile`) to provide React 18 as the Astro package's peer dependency, then install the Astro toolchain (`yarn --cwd astro install --frozen-lockfile`). Astro intentionally does not install another React copy. Both Vite targets deduplicate `react` and `react-dom`, so Gatsby and Astro shared views resolve through the same root runtime. Preview deployment packaging must include or otherwise provide this root runtime along with Astro's dependencies. The Astro check toolchain needs `@emnapi/core` and `@emnapi/runtime` explicitly with Yarn 1; without them, its CLI prompts for an installation and exits without checking files.

Commands from repository root:

- `yarn astro:static` writes `astro/dist-static/`.
- `yarn astro:ssr:build` writes a compiled standalone server to `astro/dist-ssr/`.
- `yarn astro:ssr:start` starts that compiled server (after the SSR build).
- `yarn --cwd astro typecheck` checks the isolated Astro TS boundary.

The root Gatsby `develop`, `start`, `build`, `serve`, `clean`, and `typecheck` commands are preserved. The minimal page proves only build target isolation and server startup; React styling, hydration, image handling, content fetching, and parity belong to WEB-22 and later tickets.

Validation on 26 October 2026: both Astro builds completed, the static HTML identified the static target, the compiled Node server returned the SSR target, and `yarn --cwd astro typecheck` reported zero errors, warnings, and hints. The Gatsby build reached Strapi sourcing but could not connect to the default local CMS endpoint; generated Gatsby query types were therefore unavailable for `yarn typecheck` in this checkout. Recheck those two Gatsby commands in a CMS configured environment before merging.
