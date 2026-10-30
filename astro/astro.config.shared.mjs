// Shares Astro settings and environment-backed media origins between static and preview builds.
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import { publishedSitemap } from './src/integrations/sitemap.ts';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
// Vite preserves existing process variables when loading the repository's env files.
Object.assign(
  process.env,
  loadEnv(process.env.NODE_ENV || 'development', repositoryRoot, ''),
);

const mediaSources = [
  process.env.GATSBY_STRAPI_API_URL,
  ...(process.env.STRAPI_MEDIA_ORIGINS || '').split(','),
];
const origins = new Set();
for (const source of mediaSources) {
  if (!source?.trim()) {
    continue;
  }
  const url = new URL(source.trim());
  const localHttp = url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error('Media origins require HTTPS, except HTTP loopback for local development');
  }
  if (url.username || url.password) {
    throw new Error('Media origins must not contain credentials');
  }
  origins.add(url.origin);
}
export const mediaOrigins = [...origins];

export default defineConfig({
  site: 'https://www.aascmed.com',
  root: '.',
  srcDir: './src',
  publicDir: '../static',
  integrations: [react({ jsxImportSource: '@emotion/react' }), publishedSitemap()],
  image: {
    remotePatterns: mediaOrigins.map((origin) => {
      const url = new URL(origin);
      return {
        protocol: url.protocol.slice(0, -1),
        hostname: url.hostname,
        port: url.port,
        pathname: '/**',
      };
    }),
  },
  build: { format: 'directory' },
  vite: {
    envDir: repositoryRoot,
    resolve: { dedupe: ['react', 'react-dom', '@emotion/react'] },
    ssr: { external: ['react', 'react-dom', '@emotion/react'] },
  },
});
