import assert from 'node:assert/strict';
import test from 'node:test';
import { measureNavigation } from '../../scripts/generate-navigation-metrics.mjs';
import { navigationItems, navigationSizing } from '../../src/components/header/navigation-config.mts';

test('menu threshold responds to changed labels, font size and spacing', () => {
  const original = measureNavigation().rowWidthRem;
  const longerLabels = navigationItems.map((item, index) => index === 0 ? { ...item, label: 'Patient Education and Resources' } : item);
  assert.ok(measureNavigation(longerLabels).rowWidthRem > original);
  assert.ok(measureNavigation(navigationItems, { ...navigationSizing, fontSize: 1.5 }).rowWidthRem > original);
  assert.ok(measureNavigation(navigationItems, { ...navigationSizing, linkGap: 2, letterSpacing: 0.05 }).rowWidthRem > original);
});

test('a wider logo changes the side-by-side boundary without changing the hamburger boundary', () => {
  const original = measureNavigation();
  const widerLogo = measureNavigation(navigationItems, { ...navigationSizing, logoWidth: 24 });
  assert.ok(widerLogo.rightWidthRem > original.rightWidthRem);
  assert.equal(widerLogo.rowWidthRem, original.rowWidthRem);
});
