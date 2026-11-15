import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

test('new missing hook dependencies fail lint while complete dependencies pass', async () => {
  const eslint = new ESLint();
  const source = (dependencies) => `import { useEffect } from 'react';
    export function Probe({ value }: { value: number }) {
      useEffect(() => { console.log(value); }, ${dependencies});
      return null;
    }`;
  const [broken] = await eslint.lintText(source('[]'), {
    filePath: 'src/lint-dependency-probe.tsx',
  });
  assert.ok(
    broken.messages.some(
      (message) =>
        message.ruleId === 'react-hooks/exhaustive-deps' &&
        message.severity === 2,
    ),
  );
  const [fixed] = await eslint.lintText(source('[value]'), {
    filePath: 'src/lint-dependency-probe.tsx',
  });
  assert.ok(
    !fixed.messages.some(
      (message) => message.ruleId === 'react-hooks/exhaustive-deps',
    ),
  );
});
