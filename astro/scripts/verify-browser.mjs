import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const base = 'http://127.0.0.1:4321/';
const browser = await chromium.launch();
try {
  const mobileNoJs = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const mobilePage = await mobileNoJs.newPage();
  await mobilePage.goto(base, { waitUntil: 'networkidle' });
  assert.equal(await mobilePage.getByText('A reusable, styled first paint').count(), 1);
  assert.equal(await mobilePage.locator('img[src="/assets/hero-bg.png"]').count(), 1);
  const mobileStyle = await mobilePage.locator('.half-column').nth(1).evaluate((element) => ({
    marginTop: getComputedStyle(element).marginTop,
    fontFamily: getComputedStyle(document.body).fontFamily,
  }));
  assert.ok(parseFloat(mobileStyle.marginTop) > 0, `mobile second column margin: ${mobileStyle.marginTop}`);
  assert.match(mobileStyle.fontFamily, /Poppins/i);
  const poppinsLoaded = await mobilePage.evaluate(async () => {
    await document.fonts.load('300 16px Poppins');
    await document.fonts.ready;
    return {
      available: document.fonts.check('300 16px Poppins'),
      faces: [...document.fonts].map((face) => ({ family: face.family, status: face.status })),
      stylesheet: performance.getEntriesByType('resource').find((entry) => entry.name.includes('fonts.googleapis.com/css2?family=Poppins'))?.name,
    };
  });
  assert.ok(poppinsLoaded.available && poppinsLoaded.faces.some((face) => face.family.replaceAll('"', '') === 'Poppins' && face.status === 'loaded'), `Poppins font face should load and be available to render: ${JSON.stringify(poppinsLoaded)}`);
  await mobileNoJs.close();

  const desktopNoJs = await browser.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: false });
  const desktopPage = await desktopNoJs.newPage();
  await desktopPage.goto(base, { waitUntil: 'domcontentloaded' });
  const desktopMargin = await desktopPage.locator('.half-column').nth(1).evaluate((element) => getComputedStyle(element).marginTop);
  assert.equal(parseFloat(desktopMargin), 0, `desktop second column margin: ${desktopMargin}`);
  await desktopNoJs.close();

  const hydrated = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const hydratedPage = await hydrated.newPage();
  const errors = [];
  hydratedPage.on('console', (message) => { if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text()); });
  hydratedPage.on('pageerror', (error) => errors.push(error.message));
  await hydratedPage.goto(base, { waitUntil: 'networkidle' });
  await hydratedPage.getByRole('button', { name: 'Hydrated interaction' }).click();
  assert.equal(await hydratedPage.getByText('Clicked 1 times').count(), 1);
  await hydratedPage.getByRole('button', { name: 'Hide preview badge' }).click();
  assert.equal(await hydratedPage.getByText('Draft preview hidden.').count(), 1);
  assert.equal(await hydratedPage.getByText('Clicked 1 times').count(), 1);
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log(JSON.stringify({ noJsMobileMargin: mobileStyle.marginTop, noJsDesktopMargin: desktopMargin, noJsFont: mobileStyle.fontFamily, poppinsFontLoaded: poppinsLoaded, hydratedCounter: true, independentBadge: true, hydrationWarnings: 0, otherConsoleMessages: errors.length }));
  await hydrated.close();
} finally {
  await browser.close();
}
