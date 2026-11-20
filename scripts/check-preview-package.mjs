import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

export function requirePrivatePackage(status, metadata) {
  assert.equal(status, 200, 'Cannot verify preview package visibility');
  assert.equal(metadata?.visibility, 'private', 'Preview package must be private');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    assert.ok(process.env.GITHUB_TOKEN);
    const response = await fetch('https://api.github.com/users/m-salmankhan/packages/container/aascmed.com-preview', {
      redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    requirePrivatePackage(response.status, response.status === 200 ? await response.json() : null);
  } catch {
    console.error('Cannot publish preview: verify the GHCR package is private and grants this repository Actions write access');
    process.exitCode = 1;
  }
}
