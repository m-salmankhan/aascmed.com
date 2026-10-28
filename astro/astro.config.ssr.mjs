import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
export default defineConfig({
  root: '.',
  srcDir: './src',
  publicDir: '../static',
  outDir: './dist-ssr',
  integrations: [react({ jsxImportSource: '@emotion/react' })],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('compiled Node SSR') },
    resolve: { dedupe: ['react', 'react-dom', '@emotion/react'] },
    ssr: { external: ['react', 'react-dom', '@emotion/react'] },
  },
});
