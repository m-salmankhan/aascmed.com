import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

let title = 'Fresh saved draft A';
let delay = 0;
let responseStatus = 200;
let malformed = false;
let observedStatus;
let observedAuthorization;
const mock = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  observedStatus = url.searchParams.get('status');
  observedAuthorization = req.headers.authorization;
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  res.writeHead(responseStatus, { 'content-type': 'application/json' });
  res.end(JSON.stringify(malformed ? { data: null } : { data: { title } }));
});
await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
const mockPort = mock.address().port;
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const appPort = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const app = spawn(process.execPath, ['dist-ssr/server/entry.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(appPort), ASTRO_DRAFT_API_URL: `http://localhost:${mockPort}/api/preview/1`, ASTRO_STRAPI_TOKEN: 'web22-local-proof-token' },
  stdio: 'ignore',
});
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try { ready = (await fetch(`http://127.0.0.1:${appPort}/`)).ok; } catch { /* server starting */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('SSR server did not start');
  const getHtml = async () => (await fetch(`http://127.0.0.1:${appPort}/`)).text();
  const first = await getHtml();
  if (!first.includes('Fresh saved draft A') || observedStatus !== 'draft' || observedAuthorization !== 'Bearer web22-local-proof-token') throw new Error('Strapi-shaped request A failed');
  title = 'Fresh saved draft B';
  const secondResponse = await fetch(`http://127.0.0.1:${appPort}/`);
  const second = await secondResponse.text();
  if (!second.includes('Fresh saved draft B') || second.includes('Fresh saved draft A')) throw new Error('SSR request did not fetch updated draft');
  if (!secondResponse.headers.get('cache-control')?.includes('no-store')) throw new Error('SSR response is cacheable');
  title = 'Fresh saved draft C';
  const third = await getHtml();
  if (!third.includes('Fresh saved draft C')) throw new Error('SSR request C did not fetch updated draft');
  const styleMarkup = (html) => [...html.matchAll(/<style\b[^>]*data-emotion[^>]*>[\s\S]*?<\/style>/g)].map((match) => match[0]).join('');
  const styleSizes = [first, second, third].map((html) => styleMarkup(html).length);
  if (!styleSizes.every((size) => size === styleSizes[0])) throw new Error(`SSR style output grew across requests: ${styleSizes}`);
  delay = 2200;
  const fallback = await getHtml();
  if (!fallback.includes('Proof draft: seasonal allergy update') || !fallback.includes('data-draft-source="fixture"')) throw new Error('timeout fixture fallback missing');
  delay = 0;
  responseStatus = 503;
  if (!(await getHtml()).includes('data-draft-source="fixture"')) throw new Error('upstream error fixture fallback missing');
  responseStatus = 200;
  malformed = true;
  if (!(await getHtml()).includes('data-draft-source="fixture"')) throw new Error('malformed response fixture fallback missing');
  const staticHtml = await readFile('dist-static/index.html', 'utf8');
  if (!staticHtml.includes('Proof draft: seasonal allergy update') || !staticHtml.includes('data-emotion') || staticHtml.includes('web22-local-proof-token')) throw new Error('static output fixture/style/token check failed');
  if (!staticHtml.includes('font-family:Poppins,sans-serif') || !staticHtml.includes('blockquote{border-left:')) throw new Error('extracted global styles missing from first paint');
  const columnSelector = staticHtml.match(/\.half-column:nth-of-type\(2\)/);
  if (!columnSelector) throw new Error('second-column selector was not emitted');
  console.log(JSON.stringify({ strapiStatus: observedStatus, firstRequest: 'Fresh saved draft A', secondRequest: 'Fresh saved draft B', thirdRequest: 'Fresh saved draft C', styleTagBytesAcrossRequests: styleSizes, repeatedRequest: 'fresh value rendered, no cache or style growth', authorization: 'local token sent only to upstream', timeoutFallback: 'explicit fixture', upstreamErrorFallback: true, malformedResponseFallback: true, ssrCache: 'private, no-store', staticFixture: true, emotionFirstPaint: true, responsiveSecondColumnSelector: columnSelector[0], staticContainsToken: false }));
} finally {
  if (app.exitCode === null) {
    const exited = new Promise((resolve) => app.once('exit', resolve));
    app.kill();
    await exited;
  }
  await new Promise((resolve) => mock.close(resolve));
}
