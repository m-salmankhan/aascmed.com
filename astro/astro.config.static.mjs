// Builds public pages, native Astro image assets and published social cards.
import { defineConfig } from 'astro/config';
import shared, { mediaOrigins } from './astro.config.shared.mjs';
import { publicImagesIntegration } from './src/integrations/public-images.ts';

export default defineConfig({
  ...shared,
  outDir: './dist-static',
  output: 'static',
  integrations: [
    ...shared.integrations,
    publicImagesIntegration({
      /** Create lazy streams for the three published social-card families.
       * @returns Collection iterators; unused families are never requested.
       */
      loadPublishedCollections: async () => {
        const { getPublishedCollections } = await import('./src/server/content/loaders.ts');
        return getPublishedCollections();
      },
      allowedMediaOrigins: mediaOrigins,
      mapboxToken: process.env.PUBLIC_MAPBOX_API_KEY || process.env.GATSBY_MAPBOX_API_KEY,
    }),
  ],
  vite: {
    ...shared.vite,
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
  },
});
