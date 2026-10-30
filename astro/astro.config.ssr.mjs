// Configures the Astro Node preview server and official sitemap generation.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { publishedSitemap } from './src/integrations/sitemap.ts';
import node from '@astrojs/node';
export default defineConfig({
  site: 'https://www.aascmed.com',
  root: '.',
  srcDir: './src',
  publicDir: '../static',
  outDir: './dist-ssr',
  integrations: [react({ jsxImportSource: '@emotion/react' }), publishedSitemap()],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('server') },
    resolve: { dedupe: ['react', 'react-dom', '@emotion/react'] },
    ssr: { external: ['react', 'react-dom', '@emotion/react'] },
  },
});
