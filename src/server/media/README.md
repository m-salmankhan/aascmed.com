# Images and social cards

## Social cards

`social-cards.ts` renders branded Open Graph cards for the static Astro build. Public input/result types live in the same module. `assets/` contains the font, its license, and the logo; keep these paths together because the renderer resolves them relative to its module.

The renderer preserves existing `/og-images/` URLs and keeps fingerprint/cache metadata outside public output. Native Astro image handling owns responsive CMS image transformations. Both are covered by image unit tests and an actual static-build integration.

The static image hook reads published blogs, conditions and clinics for social cards, stages their output outside the public asset directory and reuses cache metadata between builds. Reviews are not fetched for social-card generation. Canvas and sharp are application dependencies.

## Responsive CMS images

Astro owns image fetching, transforms, responsive candidates, output files and disk caching. `src/server/content/astro-media.ts` passes native `width`, `layout` and `sizes` inputs to `getImage()` and converts the returned attributes for shared React image components. See the [framework-component use of getImage](https://docs.astro.build/en/guides/images/#generating-images-with-getimage).

Each page prepares the record it displays and supplies the view's intended display width. Constrained layout generates density variants bounded by the source; lazy `sizes="auto"` lets the browser use the actual CSS slot. The hero uses full-width layout.

`STRAPI_API_URL` supplies the CMS media origin. For uploads on another CDN, add full origins, including custom ports, to `STRAPI_MEDIA_ORIGINS`. Astro images and social cards share this allowlist; see the [environment inventory](../../../docs/environment-variables.md).

Authorized remote uploads produce local `/_astro/` files during static builds and on-demand image URLs in SSR. Relative rich-text image URLs resolve against the CMS and use the same service. SVGs and static provider social images also have local build output. Integration tests verify remote-source pixels and files, including small thumbnails and wide images. Live Mapbox maps are a separate runtime integration.

## Netlify build cache

The repository's local Netlify Build plugin explicitly restores these directories before the build command and saves them after a successful build:

- `node_modules/.astro/assets`: Astro's optimized images and freshness metadata.
- `.astro/public-images`: generated social-card JPEGs, needed to reuse their output.
- `.astro/public-image-cache`: social-card fingerprints, needed to detect changed inputs.

Both social-card directories must survive together. A reuse check validates the input fingerprint and the actual JPEG's SHA-256 checksum, so a partial save/restore cannot pair a new fingerprint with stale image bytes. Older input-only fingerprints cause a one-time regeneration. Only currently requested card paths are copied into `dist`; fingerprints and unused cached cards are not published. The plugin does not cache CMS responses, environment files, the entire dependency directory or `dist`.

The first successful build with this plugin may still be cold. Later builds on the same Netlify cache line should log `[image-cache] Restored …`, Astro's `(reused cache entry)` or `(revalidated cache entry)`, and social-card reused/generated counts. New branch/PR caches can start cold or fall back to production; clearing the Netlify build cache also removes this state. See [Netlify cache behavior](https://docs.netlify.com/build/configure-builds/troubleshooting-tips/#build-cache-key-behavior).

Cached images still respect source freshness and changed transformation settings. Social cards still read source bytes to detect changes; reuse avoids rendering/encoding unchanged JPEGs, not all network activity. Titles and source bytes invalidate their existing fingerprints. Bump the renderer's `CACHE_VERSION` when changing its drawing/encoder behavior so a persisted old JPEG cannot survive the implementation change.

Missing caches are normal. A failed restore discards that partial cache and rebuilds; failed cache saves are reported without failing the completed build. If a restored cache is corrupt, use Netlify's retry-without-cache option to rebuild it.
