// Builds the protected Node preview server with the shared Astro settings.
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import shared from './astro.config.shared.ts';

export default defineConfig({
  ...shared,
  outDir: './dist-ssr',
  output: 'server',
  // The preview image must compile without contacting the CMS or containing credentials.
  integrations: shared.integrations.filter((integration) => integration.name !== '@astrojs/sitemap'),
  adapter: node({ mode: 'standalone' }),
  vite: {
    ...shared.vite,
    define: { 'import.meta.env.PUBLIC_ASTRO_TARGET': JSON.stringify('server') },
  },
});
