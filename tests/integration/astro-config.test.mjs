// Checks real Astro config loading resolves deployed CMS and media origins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('Astro config derives and deduplicates CMS/media image origins from environment', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const script = `
    import config, { mediaOrigins } from './astro/astro.config.shared.mjs';
    console.log('CONFIG_RESULT:' + JSON.stringify({
      mediaOrigins,
      remotePatterns: config.image.remotePatterns,
    }));
  `;
  const output = execFileSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '--eval', script],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        GATSBY_STRAPI_API_URL: 'https://cms.config-test.example/api',
        STRAPI_MEDIA_ORIGINS:
          'https://cdn.config-test.example:8443, https://cms.config-test.example, https://cdn.config-test.example:8443/',
      },
      encoding: 'utf8',
    },
  );
  const resultLine = output
    .split('\n')
    .find((line) => line.startsWith('CONFIG_RESULT:'));
  assert.ok(resultLine, 'the real Astro config emits its resolved origins');
  const { mediaOrigins, remotePatterns } = JSON.parse(
    resultLine.slice('CONFIG_RESULT:'.length),
  );
  assert.deepEqual(
    [...mediaOrigins].sort(),
    ['https://cdn.config-test.example:8443', 'https://cms.config-test.example'],
    'process environment overrides env-file settings and duplicate origins collapse',
  );
  assert.deepEqual(
    remotePatterns
      .map(({ protocol, hostname, port, pathname }) => ({
        origin: `${protocol}://${hostname}${port ? `:${port}` : ''}`,
        pathname,
      }))
      .sort((left, right) => left.origin.localeCompare(right.origin)),
    [
      { origin: 'https://cdn.config-test.example:8443', pathname: '/**' },
      { origin: 'https://cms.config-test.example', pathname: '/**' },
    ],
    'Astro image domains use the same complete origins, including a configured port',
  );
  assert.equal(
    remotePatterns.some(({ hostname }) =>
      hostname.includes('wise-positivity-21c2bd6b3f'),
    ),
    false,
    'the former Strapi tenant is not an implicit image host',
  );
});
