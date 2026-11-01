# Social cards

`social-cards.ts` renders branded Open Graph cards for the static Astro build. Public input/result types live in the same module. `assets/` contains the font, its license, and the logo; keep these paths together because the renderer resolves them relative to its module.

The renderer preserves existing `/og-images/` URLs and keeps fingerprint/cache metadata outside public output. Native Astro image handling owns responsive CMS image transformations. Both are covered by image unit tests and an actual static-build integration.
