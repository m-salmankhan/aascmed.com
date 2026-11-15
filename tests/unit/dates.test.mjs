import assert from 'node:assert/strict';
import test from 'node:test';

test('native dates preserve ordinal, review and service-update formats in UTC', async () => {
  const { formatOrdinalDate, formatReviewDate, formatServiceUpdateDate, ordinal } = await import('../../src/utils/dates.ts');
  assert.deepEqual([1,2,3,4,11,12,13,21,22,23,31].map(ordinal), ['1st','2nd','3rd','4th','11th','12th','13th','21st','22nd','23rd','31st']);
  assert.equal(formatOrdinalDate('2026-11-01T00:30:00Z'), '1st November 2026');
  assert.equal(formatReviewDate('2026-11-01T00:30:00Z'), 'November 1, 2026');
  assert.equal(formatOrdinalDate('2026-11-01T23:30:00-06:00'), '2nd November 2026');
  assert.equal(formatServiceUpdateDate('2026-11-01T23:30:00-06:00'), '1st November 2026');
  assert.equal(formatOrdinalDate('2024-02-29'), '29th February 2024');
  for (const value of ['', null, undefined, 'invalid', '2026-02-30', '2026-13-01', '2026-11-01junk']) {
    assert.equal(formatOrdinalDate(value), '');
    assert.equal(formatReviewDate(value), '');
    assert.equal(formatServiceUpdateDate(value), '');
  }
});
