// Run the built production image with synthetic CMS data; no real service credentials are used.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { startFixtureCms, fixtureToken } from '../tests/fixtures/astro-cms/server.mjs';

const [engine = 'podman', image = 'localhost/aascmed-preview:dev'] = process.argv.slice(2);
assert.ok(['podman', 'docker'].includes(engine), 'Choose podman or docker');
const run = (...args) => execFileSync(engine, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const name = `astro-preview-test-${randomUUID()}`;
const volume = `${name}-secret`;
const cms = await startFixtureCms();
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const origin = `http://127.0.0.1:${port}`;
try {
  run('volume', 'create', volume);
  run('run', '--rm', '--user', '0', '--network', 'none', '-v', `${volume}:/secrets`, '--entrypoint', 'node', image,
    '-e', `const fs=require('fs');fs.writeFileSync('/secrets/token',${JSON.stringify(fixtureToken)},{mode:0o400});fs.chownSync('/secrets/token',10002,10002);`);
  run('run', '-d', '--name', name, '--network', 'host', '--read-only', '--cap-drop=ALL', '--security-opt', 'no-new-privileges',
    '--tmpfs', '/tmp:rw,nosuid,noexec,size=64m', '-v', `${volume}:/run/secrets:ro`,
    '-e', 'HOST=127.0.0.1', '-e', `PORT=${port}`, '-e', `STRAPI_API_URL=${cms.origin}`, '-e', 'STRAPI_TOKEN_FILE=/run/secrets/token', image);
  let live;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { live = await fetch(`${origin}/_health/live`); break; } catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  assert.equal(live?.status, 200, 'container becomes live');
  assert.equal((await fetch(`${origin}/_health/ready`)).status, 200, 'mounted token can read drafts');
  const inspect = JSON.parse(run('inspect', name))[0];
  assert.equal(inspect.Config.User, '10002:10002');
  assert.equal(inspect.HostConfig.ReadonlyRootfs, true);
  cms.draft['privacy-policy'].title = 'Edited after container startup';
  const page = await fetch(`${origin}/privacy/`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(html.includes('Edited after container startup'), 'saved changes render without image rebuild');
  assert.ok(!html.includes(fixtureToken), 'CMS credential stays out of HTML');
  assert.match(page.headers.get('cache-control'), /no-store/);
  cms.unavailableResources.add('blogs');
  assert.equal((await fetch(`${origin}/_health/ready`)).status, 503, 'CMS outages fail readiness');
  run('stop', '-t', '10', name);
  assert.equal(JSON.parse(run('inspect', name))[0].State.ExitCode, 0, 'SIGTERM drains the server and exits cleanly');
  let missingFileRejected = false;
  try { run('run', '--rm', '--network', 'none', '-e', 'STRAPI_API_URL=https://cms.example.test', image); } catch (error) { missingFileRejected = /Preview startup failed/.test(String(error.stderr)); }
  assert.ok(missingFileRejected, 'draft container refuses a missing secret file');
  console.log('Preview image passed: non-root/read-only, health, mounted token, fresh drafts, outage and stop checks.');
} finally {
  try { run('rm', '-f', name); } catch { /* A startup failure can leave no container. */ }
  try { run('volume', 'rm', volume); } catch { /* Preserve the original test failure. */ }
  await cms.close();
}
