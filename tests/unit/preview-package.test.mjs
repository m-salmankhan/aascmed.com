import assert from 'node:assert/strict';
import test from 'node:test';
import { requirePrivatePackage } from '../../scripts/check-preview-package.mjs';

test('publication requires a verified private package, including before the first push', () => {
  requirePrivatePackage(200, { visibility: 'private' });
  for (const visibility of ['public', 'internal', undefined]) {
    assert.throws(() => requirePrivatePackage(200, { visibility }));
  }
  for (const status of [401, 403, 404, 500]) {
    assert.throws(() => requirePrivatePackage(status, null));
  }
});
