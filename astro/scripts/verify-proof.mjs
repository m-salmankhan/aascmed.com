import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';

let title = 'Fresh saved draft A';
let delay = 0;
let responseStatus = 200;
let malformed = false;
let openErrorBody = false;
let errorBodyClosed = false;
let observedStatus;
let observedAuthorization;
let observedPath;
const mock = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  observedPath = url.pathname;
  observedStatus = url.searchParams.get('status');
  observedAuthorization = req.headers.authorization;
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  if (openErrorBody) {
    res.writeHead(responseStatus, { 'content-type': 'application/json' });
    res.write('{"error":"upstream unavailable"');
    const cleanupTimer = setTimeout(() => res.end('}'), 5000);
    res.once('close', () => {
      errorBodyClosed = true;
      clearTimeout(cleanupTimer);
    });
    return;
  }
  res.writeHead(responseStatus, { 'content-type': 'application/json' });
  res.end(JSON.stringify(malformed ? { data: null } : { data: [{ id: 1, documentId: 'proof-blog', title }] }));
});
await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
const mockPort = mock.address().port;
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const appPort = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const app = spawn(process.execPath, ['dist-ssr/server/entry.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(appPort), GATSBY_STRAPI_API_URL: `http://localhost:${mockPort}`, STRAPI_TOKEN: 'web22-local-proof-token' },
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
  if (!first.includes('Fresh saved draft A') || observedPath !== '/api/blogs' || observedStatus !== 'draft' || observedAuthorization !== 'Bearer web22-local-proof-token') throw new Error('Strapi-shaped request A failed');
  title = 'Fresh saved draft B';
  const secondResponse = await fetch(`http://127.0.0.1:${appPort}/`);
  const second = await secondResponse.text();
  if (!second.includes('Fresh saved draft B') || second.includes('Fresh saved draft A')) throw new Error('SSR request did not fetch updated draft');
  if (!secondResponse.headers.get('cache-control')?.includes('no-store')) throw new Error('SSR response is cacheable');
  title = 'Fresh saved draft C';
  const third = await getHtml();
  if (!third.includes('Fresh saved draft C')) throw new Error('SSR request C did not fetch updated draft');
  const styleMarkup = (html) => [...html.matchAll(/<style\b[^>]*data-emotion[^>]*>[\s\S]*?<\/style>/g)].map((match) => match[0]).join('');
  for (const [index, html] of [first, second, third].entries()) {
    const styles = styleMarkup(html);
    if (!styles || !styles.includes('font-family:Poppins,sans-serif') || !styles.includes('blockquote{border-left:') || !styles.includes('.half-column:nth-of-type(2)')) {
      throw new Error(`SSR response ${index + 1} is missing populated Emotion Global or column styles`);
    }
  }
  const styleSizes = [first, second, third].map((html) => styleMarkup(html).length);
  if (!styleSizes.every((size) => size === styleSizes[0])) throw new Error(`SSR style output grew across requests: ${styleSizes}`);
  delay = 2200;
  const fallback = await getHtml();
  if (!fallback.includes('Proof draft: seasonal allergy update') || !fallback.includes('data-draft-source="fixture"')) throw new Error('timeout fixture fallback missing');
  delay = 0;
  responseStatus = 503;
  openErrorBody = true;
  const errorStartedAt = Date.now();
  const errorFallback = await getHtml();
  const errorElapsedMs = Date.now() - errorStartedAt;
  if (!errorFallback.includes('data-draft-source="fixture"')) throw new Error('upstream error fixture fallback missing');
  if (errorElapsedMs > 1500) throw new Error(`open error body delayed fallback for ${errorElapsedMs}ms`);
  for (let i = 0; i < 50 && !errorBodyClosed; i++) await new Promise((resolve) => setTimeout(resolve, 10));
  if (!errorBodyClosed) throw new Error('open upstream error body was not cancelled');
  openErrorBody = false;
  responseStatus = 200;
  malformed = true;
  if (!(await getHtml()).includes('data-draft-source="fixture"')) throw new Error('malformed response fixture fallback missing');
  const staticHtml = await readFile('dist-static/index.html', 'utf8');
  if (!staticHtml.includes('Proof draft: seasonal allergy update') || !staticHtml.includes('data-emotion') || staticHtml.includes('web22-local-proof-token')) throw new Error('static output fixture/style/token check failed');
  if (!staticHtml.includes('font-family:Poppins,sans-serif') || !staticHtml.includes('blockquote{border-left:')) throw new Error('extracted global styles missing from first paint');
  if (!staticHtml.includes('https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&display=swap') || !staticHtml.includes('rel="preconnect" href="https://fonts.gstatic.com"')) throw new Error('static output is missing Gatsby-compatible Poppins font loading hints');
  const columnSelector = staticHtml.match(/\.half-column:nth-of-type\(2\)/);
  if (!columnSelector) throw new Error('second-column selector was not emitted');
  console.log(JSON.stringify({ strapiStatus: observedStatus, firstRequest: 'Fresh saved draft A', secondRequest: 'Fresh saved draft B', thirdRequest: 'Fresh saved draft C', styleTagBytesAcrossRequests: styleSizes, repeatedRequest: 'fresh value rendered, no cache or style growth', populatedEmotionStylesPerSsrResponse: true, authorization: 'local token sent only to upstream', timeoutFallback: 'explicit fixture', upstreamErrorFallback: true, openErrorBodyCancelled: true, errorFallbackMs: errorElapsedMs, malformedResponseFallback: true, ssrCache: 'private, no-store', staticFixture: true, emotionFirstPaint: true, poppinsStylesheet: true, responsiveSecondColumnSelector: columnSelector[0], staticContainsToken: false }));
} finally {
  if (app.exitCode === null) {
    const exited = new Promise((resolve) => app.once('exit', resolve));
    app.kill();
    await exited;
  }
  await new Promise((resolve) => mock.close(resolve));
}
