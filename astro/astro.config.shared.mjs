// Shares Astro settings and environment-backed media origins between static and preview builds.
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { publishedSitemap } from './src/integrations/sitemap.ts';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const { values } = parseArgs({
  options: { mode: { type: 'string' } },
  strict: false,
  allowPositionals: true,
});
const mode = values.mode || process.env.NODE_ENV || 'development';
// Vite preserves existing process variables when loading the repository's env files.
Object.assign(process.env, loadEnv(mode, repositoryRoot, ''));

const cdnOrigins = (process.env.STRAPI_MEDIA_ORIGINS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
for (const source of cdnOrigins) {
  const url = new URL(source);
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      'STRAPI_MEDIA_ORIGINS requires origins without paths, queries or fragments',
    );
  }
}
const mediaSources = [process.env.GATSBY_STRAPI_API_URL, ...cdnOrigins];
const origins = new Set();
for (const source of mediaSources) {
  if (!source?.trim()) {
    continue;
  }
  const url = new URL(source.trim());
  const localHttp =
    url.protocol === 'http:' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) {
    throw new Error(
      'Media origins require HTTPS, except HTTP loopback for local development',
    );
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
  integrations: [
    react({ jsxImportSource: '@emotion/react' }),
    publishedSitemap(),
  ],
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
