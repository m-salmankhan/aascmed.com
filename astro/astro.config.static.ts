// Builds public pages, native Astro image assets and published social cards.
import { defineConfig } from 'astro/config';
import shared, { mediaOrigins } from './astro.config.shared.ts';
import { publicImagesIntegration } from './src/integrations/public-images.ts';
import { getPublishedCollections } from './src/server/content/loaders.ts';

export default defineConfig({
  ...shared,
  outDir: './dist-static',
  output: 'static',
  integrations: [
    ...shared.integrations,
    publicImagesIntegration({
      loadPublishedCollections: getPublishedCollections,
      allowedMediaOrigins: mediaOrigins,
      mapboxToken: process.env.PUBLIC_MAPBOX_API_KEY || process.env.GATSBY_MAPBOX_API_KEY,
    }),
  ],
  vite: {
    ...shared.vite,
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
  },
});
