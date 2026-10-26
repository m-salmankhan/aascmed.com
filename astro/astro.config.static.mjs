import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  root: '.',
  srcDir: './src',
  publicDir: '../static',
  outDir: './dist-static',
  integrations: [react()],
  output: 'static',
  build: { format: 'directory' },
  vite: {
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('static') },
    resolve: { dedupe: ['react', 'react-dom'] },
  },
});
