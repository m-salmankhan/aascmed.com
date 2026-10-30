// Configures the static Astro site and published image generation before prerendering.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { publishedSitemap } from './src/integrations/sitemap.ts';
import { getPublicMediaHosts } from './src/config/public-media-hosts.ts';
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
      /** Create lazy published streams for this build's social cards.
       * @returns Published collection iterators; only blog, condition and clinic streams are consumed.
       */
      loadPublishedCollections: async () => {
        const { getPublishedCollections } = await import(
          './src/server/content/loaders.ts'
        );
        return getPublishedCollections();
      },
      mapboxToken:
        process.env.PUBLIC_MAPBOX_API_KEY || process.env.GATSBY_MAPBOX_API_KEY,
    }),
  ],
  output: 'static',
  image: {
    remotePatterns: getPublicMediaHosts().map(
      ({ protocol, hostname, port }) => ({
        protocol,
        hostname,
        ...(port ? { port } : {}),
        pathname: '/**',
      }),
    ),
  },
  build: { format: 'directory' },
  vite: {
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
    resolve: { dedupe: ['react', 'react-dom', '@emotion/react'] },
    ssr: { external: ['react', 'react-dom', '@emotion/react'] },
  },
});
