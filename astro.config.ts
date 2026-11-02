// Builds public pages, native Astro image assets and published social cards.
import { defineConfig } from 'astro/config';
import shared, { mediaOrigins } from './astro.config.shared.ts';
import { publicImagesIntegration } from './src/integrations/public-images.ts';
import { getPublishedCollections } from './src/server/content/loaders.ts';
import { publishedSitemap } from './src/integrations/sitemap.ts';

export default defineConfig({
  ...shared,
  outDir: './dist',
  output: 'static',
  integrations: [
    ...shared.integrations,
    publishedSitemap(),
    publicImagesIntegration({
      loadPublishedCollections: getPublishedCollections,
      allowedMediaOrigins: mediaOrigins,
    }),
  ],
  vite: {
    ...shared.vite,
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
  },
});
