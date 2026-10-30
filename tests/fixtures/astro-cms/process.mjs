// Runs actual Astro builds and native preview processes for isolated integration tests.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
export const astroRoot = fileURLToPath(new URL('../../../astro/', import.meta.url));
const node = process.execPath;
/** Reserve an ephemeral loopback port for an actual Astro server.
 * @returns Available local port after closing the short-lived probe.
 */
export async function availablePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
/** Start a real command and retain diagnostics for failures without polluting normal test output.
 * @param args Arguments for the current Node executable.
 * @param env Isolated CMS/runtime environment shared by the build and preview process.
 * @returns Child process plus its captured build/server diagnostics.
 */
export function command(args, env) {
  const child = spawn(node, args, { cwd: astroRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  return { child, diagnostics: () => output.slice(-10000) };
}
/** Build an actual Astro target against the local content fixture.
 * @param config Static or compiled Node server configuration.
 * @param env Environment selecting fixture CMS, token, media origins and preview mode.
 * @returns After a successful build; failures include the relevant diagnostics.
 */
export async function build(config, env) {
  const process = command(['node_modules/astro/bin/astro.mjs', 'build', '--config', config], env);
  const exit = await new Promise((resolve, reject) => {
    process.child.once('error', reject);
    process.child.once('exit', resolve);
  });
  assert.equal(exit, 0, `${config} failed:\n${process.diagnostics()}`);
}
/** Wait for a real Astro process to respond rather than assuming a fixed startup delay.
 * @param process Child process and its failure diagnostics.
 * @param origin Local server origin.
 * @returns After the process responds; startup exits and timeouts fail the test.
 */
export async function ready(process, origin) {
  for (let attempt = 0; attempt < 150; attempt++) {
    if (process.child.exitCode !== null) {
      assert.fail(process.diagnostics());
    }
    try {
      const response = await fetch(origin);
      await response.body?.cancel();
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.fail(`Astro server did not start: ${process.diagnostics()}`);
}
/** Stop a test-owned Astro process and wait for its handles to be released.
 * @param process Optional command handle whose child is still running.
 * @returns After the process has exited.
 */
export async function stop(process) {
  if (!process || process.child.exitCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => process.child.once('exit', resolve));
  process.child.kill('SIGTERM');
  await exited;
}
