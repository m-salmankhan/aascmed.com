import assert from 'node:assert/strict';
import test from 'node:test';
import { requirePrivatePackage } from '../../scripts/check-preview-package.mjs';

test('publication allows private packages or first creation, then requires confirmed private visibility', () => {
  requirePrivatePackage(200, { visibility: 'private' }, true);
  requirePrivatePackage(200, { visibility: 'private' }, false);
  requirePrivatePackage(404, null, true);
  for (const before of [true, false]) {
    for (const visibility of ['public', 'internal', undefined]) assert.throws(() => requirePrivatePackage(200, { visibility }, before));
    for (const status of [401, 403, 500]) assert.throws(() => requirePrivatePackage(status, null, before));
  }
  assert.throws(() => requirePrivatePackage(404, null, false));
});
