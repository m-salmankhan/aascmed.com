// Configures the Astro static site and official sitemap generation.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { publishedSitemap } from './src/integrations/sitemap.ts';
export default defineConfig({
  site: 'https://www.aascmed.com',
  root: '.',
  srcDir: './src',
  publicDir: '../static',
  outDir: './dist-static',
  integrations: [react({ jsxImportSource: '@emotion/react' }), publishedSitemap()],
  output: 'static',
  build: { format: 'directory' },
  vite: {
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
    resolve: { dedupe: ['react', 'react-dom', '@emotion/react'] },
    ssr: { external: ['react', 'react-dom', '@emotion/react'] },
  },
});
