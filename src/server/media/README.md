# Social cards

`social-cards.ts` renders branded Open Graph cards for the static Astro build. Public input/result types live in the same module. `assets/` contains the font, its license, and the logo; keep these paths together because the renderer resolves them relative to its module.

The renderer preserves existing `/og-images/` URLs and keeps fingerprint/cache metadata outside public output. Native Astro image handling owns responsive CMS image transformations. Both are covered by image unit tests and an actual static-build integration.

## Netlify build cache

The repository's local Netlify Build plugin explicitly restores these directories before the build command and saves them after a successful build:

- `node_modules/.astro/assets`: Astro's optimized images and freshness metadata.
- `.astro/public-images`: generated social-card JPEGs, needed to reuse their output.
- `.astro/public-image-cache`: social-card fingerprints, needed to detect changed inputs.

Both social-card directories must survive together. A reuse check validates the input fingerprint and the actual JPEG's SHA-256 checksum, so a partial save/restore cannot pair a new fingerprint with stale image bytes. Older input-only fingerprints cause a one-time regeneration. Only currently requested card paths are copied into `dist`; fingerprints and unused cached cards are not published. The plugin does not cache CMS responses, environment files, the entire dependency directory or `dist`.

The first successful build with this plugin may still be cold. Later builds on the same Netlify cache line should log `[image-cache] Restored …`, Astro's `(reused cache entry)` or `(revalidated cache entry)`, and social-card reused/generated counts. New branch/PR caches can start cold or fall back to production; clearing the Netlify build cache also removes this state. See [Netlify cache behavior](https://docs.netlify.com/build/configure-builds/troubleshooting-tips/#build-cache-key-behavior).

Cached images still respect source freshness and changed transformation settings. Social cards still read source bytes to detect changes; reuse avoids rendering/encoding unchanged JPEGs, not all network activity. Titles and source bytes invalidate their existing fingerprints. Bump the renderer's `CACHE_VERSION` when changing its drawing/encoder behavior so a persisted old JPEG cannot survive the implementation change.

Missing caches are normal. A failed restore discards that partial cache and rebuilds; failed cache saves are reported without failing the completed build. If a restored cache is corrupt, use Netlify's retry-without-cache option to rebuild it.
