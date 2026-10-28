import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const astroDir = fileURLToPath(new URL('../', import.meta.url));
const repositoryDir = fileURLToPath(new URL('../../', import.meta.url));
const rootRequire = createRequire(`${repositoryDir}package.json`);
const astroRequire = createRequire(`${astroDir}package.json`);

function realDependency(resolver, name) {
  return realpathSync(resolver.resolve(name));
}

for (const dependency of ['react', 'react-dom', '@emotion/react']) {
  assert.equal(
    realDependency(astroRequire, dependency),
    realDependency(rootRequire, dependency),
    `Astro and the repository must share one ${dependency} installation`,
  );
}

const sharedReact = realDependency(rootRequire, 'react');
for (const [label, entry] of [
  ['Astro React integration', astroRequire.resolve('@astrojs/react')],
  ['Strapi blocks renderer', rootRequire.resolve('@strapi/blocks-react-renderer')],
  ['React carousel', rootRequire.resolve('pure-react-carousel')],
]) {
  const resolver = createRequire(entry);
  assert.equal(
    realDependency(resolver, 'react'),
    sharedReact,
    `${label} must resolve the repository React runtime`,
  );
}

console.log('Astro, shared UI, Strapi blocks, and carousel resolve one React runtime.');
