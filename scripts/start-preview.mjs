import { contentToken } from '../src/server/content/token.mjs';

try {
  if (process.env.ASTRO_CONTENT_MODE === 'draft') {
    contentToken(true);
    const cms = new URL(process.env.STRAPI_API_URL);
    if ((cms.protocol !== 'https:' && !(cms.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(cms.hostname))) || cms.username || cms.password || cms.search || cms.hash) throw new Error('Invalid CMS URL');
  }
  process.env.ASTRO_NODE_AUTOSTART = 'disabled';
  const { startServer } = await import('../dist-ssr/server/entry.mjs');
  const { server, done } = startServer();
  const stop = () => {
    const force = setTimeout(() => { void server.stop(); }, 5000).unref();
    server.server.close(() => { clearTimeout(force); process.exit(0); });
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  await done;
} catch {
  console.error('Preview startup failed: check the runtime CMS URL and secret file');
  process.exitCode = 1;
}
