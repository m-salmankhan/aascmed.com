import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';

const localModule = (name) => fileURLToPath(new URL(`./node_modules/${name}`, import.meta.url));

export default defineConfig({
  root: '.',
  srcDir: './src',
  publicDir: '../static',
  outDir: './dist-static',
  integrations: [react({ jsxImportSource: '@emotion/react' })],
  output: 'static',
  build: { format: 'directory' },
  vite: {
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
    resolve: { alias: { react: localModule('react'), 'react-dom': localModule('react-dom'), '@emotion/react': localModule('@emotion/react') }, dedupe: ['react', 'react-dom', '@emotion/react'] },
  },
});
