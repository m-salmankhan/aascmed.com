// Configures the static Astro site and published image generation before prerendering.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { publishedSitemap } from './src/integrations/sitemap.ts';
import { publicImagesIntegration } from './src/integrations/public-images.ts';
export default defineConfig({
  site: 'https://www.aascmed.com',
  root: '.',
  srcDir: './src',
  publicDir: '../static',
  outDir: './dist-static',
  integrations: [
    react({ jsxImportSource: '@emotion/react' }),
    publishedSitemap(),
    publicImagesIntegration({
      /** Read the published collections once for this build's images and prerendered routes.
       * @returns A normalized snapshot shared through the private build bridge.
       */
      loadPublishedSnapshot: async () => {
        const { getPublishedBuildSnapshot } = await import('./src/server/content/loaders.ts');
        const { createStrapiRequestScope } = await import('./src/server/content/strapi.ts');
        return getPublishedBuildSnapshot({ scope: createStrapiRequestScope() });
      },
      mapboxToken: process.env.PUBLIC_MAPBOX_API_KEY || process.env.GATSBY_MAPBOX_API_KEY,
    }),
  ],
  output: 'static',
  build: { format: 'directory' },
  vite: {
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
    resolve: { dedupe: ['react', 'react-dom', '@emotion/react'] },
    ssr: { external: ['react', 'react-dom', '@emotion/react'] },
  },
});
