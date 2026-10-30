// Builds the protected Node preview server with the shared Astro settings.
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import shared from './astro.config.shared.ts';

export default defineConfig({
  ...shared,
  outDir: './dist-ssr',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    ...shared.vite,
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('server') },
  },
});
