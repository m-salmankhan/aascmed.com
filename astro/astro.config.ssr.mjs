import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import { fileURLToPath } from 'node:url';

const localModule = (name) => fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url));

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
    resolve: { alias: { react: localModule('react'), 'react-dom': localModule('react-dom'), '@emotion/react': localModule('@emotion/react') }, dedupe: ['react', 'react-dom', '@emotion/react'] },
  },
});
