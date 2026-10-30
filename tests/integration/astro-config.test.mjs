// Checks real Astro config loading resolves deployed CMS and media origins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('Astro config derives and deduplicates CMS/media image origins from environment', () => {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  );
  const script = `
    import config, { mediaOrigins } from './astro/astro.config.shared.ts';
    console.log('CONFIG_RESULT:' + JSON.stringify({
      mediaOrigins,
      remotePatterns: config.image.remotePatterns,
    }));
  `;
  const mode = `config-test-${randomUUID()}`;
  const envFile = path.join(repoRoot, `.env.${mode}`);
  writeFileSync(
    envFile,
    [
      'GATSBY_STRAPI_API_URL=https://from-file.config-test.example/api',
      'STRAPI_MEDIA_ORIGINS=https://file-cdn.config-test.example:9443',
    ].join('\n'),
    { flag: 'wx' },
  );
  try {
    const output = execFileSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--input-type=module',
        '--eval',
        script,
        '--',
        'astro',
        '--mode',
        mode,
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          NODE_ENV: 'production',
          STRAPI_TOKEN: 'fixture-config-token',
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
      [
        'https://cdn.config-test.example:8443',
        'https://cms.config-test.example',
      ],
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
    const fromFileEnvironment = {
      ...process.env,
      NODE_ENV: 'production',
      STRAPI_TOKEN: 'fixture-config-token',
    };
    delete fromFileEnvironment.GATSBY_STRAPI_API_URL;
    delete fromFileEnvironment.STRAPI_MEDIA_ORIGINS;
    const fromFile = execFileSync(
      process.execPath,
      [
        '--experimental-strip-types',
        '--input-type=module',
        '--eval',
        script,
        '--',
        'astro',
        '--mode',
        mode,
      ],
      { cwd: repoRoot, env: fromFileEnvironment, encoding: 'utf8' },
    );
    const fileResult = JSON.parse(
      fromFile
        .split('\n')
        .find((line) => line.startsWith('CONFIG_RESULT:'))
        .slice('CONFIG_RESULT:'.length),
    );
    assert.deepEqual(
      fileResult.mediaOrigins.sort(),
      [
        'https://file-cdn.config-test.example:9443',
        'https://from-file.config-test.example',
      ],
      'Astro --mode selects its env file even though NODE_ENV is production',
    );
  } finally {
    unlinkSync(envFile);
  }
});
