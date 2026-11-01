// Run the pre-refactor component and current component in the same browser/build.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import navigationHelpers from '../ui/helpers.js';
import { chromium, expect } from '@playwright/test';
import { startFixtureCms, fixtureToken } from '../fixtures/astro-cms/server.mjs';
import { availablePort, command, build, ready, stop } from '../fixtures/astro-cms/process.mjs';

const temporary = [
  new URL('../../src/components/header/__legacy-navigation.tsx', import.meta.url),
  new URL('../../src/components/header/__motion-fixture.tsx', import.meta.url),
  new URL('../../src/pages/verification-navigation-original.astro', import.meta.url),
  new URL('../../src/pages/verification-navigation-current.astro', import.meta.url),
];
const font = (await readFile(new URL('../../src/server/media/assets/Poppins-ExtraBold.ttf', import.meta.url))).toString('base64');

async function finishAnimations(locator) {
  await locator.evaluate(element => Promise.allSettled(element.getAnimations({ subtree: true }).map(animation => animation.finished)));
}

async function sampleTransform(locator) {
  await expect.poll(() => locator.evaluate(element => element.getAnimations().some(animation => 'transitionProperty' in animation && animation.transitionProperty === 'transform'))).toBe(true);
  return locator.evaluate(async element => {
    const animation = element.getAnimations().find(animation => 'transitionProperty' in animation && animation.transitionProperty === 'transform');
    animation.pause();
    await animation.ready;
    const duration = Number(animation.effect.getTiming().duration);
    const keyframes = animation.effect.getKeyframes();
    const frames = [];
    for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
      animation.currentTime = duration * progress;
      frames.push(getComputedStyle(element).transform);
    }
    animation.finish();
    await animation.finished;
    return { duration, easing: keyframes[0].easing, keyframes: keyframes.map(frame => frame.transform), frames };
  });
}

async function sampleTransition(locator) {
  await expect.poll(() => locator.evaluate(element => element.getAnimations().some(animation => 'transitionProperty' in animation && animation.transitionProperty === 'max-height'))).toBe(true);
  return locator.evaluate(async element => {
    const animation = element.getAnimations().find(animation => 'transitionProperty' in animation && animation.transitionProperty === 'max-height');
    animation.pause();
    await animation.ready;
    const timing = animation.effect.getTiming();
    const frames = [];
    for (const progress of [0, 0.1, 0.3, 0.5, 0.7, 0.9]) {
      animation.currentTime = Number(timing.duration) * progress;
      frames.push({ height: element.getBoundingClientRect().height, maxHeight: parseFloat(getComputedStyle(element).maxHeight) });
    }
    animation.finish();
    await animation.finished;
    return { duration: timing.duration, easing: animation.effect.getKeyframes()[0].easing, keyframes: animation.effect.getKeyframes().map(frame => frame.maxHeight), frames };
  });
}

async function interactionContract(page, origin, legacy) {
  assert.equal((await page.goto(`${origin}/verification-navigation-${legacy ? 'original' : 'current'}/`, { waitUntil: 'domcontentloaded' })).status(), 200);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  const nav = page.locator('nav').first();
  const toggle = legacy ? nav.getByRole('button', { name: 'Menu', exact: true }) : nav.locator('summary');
  const panel = legacy ? nav.locator('ul').first() : nav.locator('.mobile-menu-content');
  const logo = nav.locator('a').filter({ has: page.locator('svg') }).first();
  const visibleLogo = logo.locator('svg:visible');
  const result = {};

  result.logoMotion = await visibleLogo.evaluate(svg => { const s = getComputedStyle(svg); return [s.transitionProperty, s.transitionDuration, s.transitionTimingFunction]; });
  await logo.focus();
  await expect(logo).toBeFocused();
  result.logoFocusAnimation = await sampleTransform(visibleLogo);
  result.logoFocused = await visibleLogo.evaluate(svg => getComputedStyle(svg).transform);
  await toggle.focus();
  result.logoBlurAnimation = await sampleTransform(visibleLogo);
  result.logoResting = await visibleLogo.evaluate(svg => getComputedStyle(svg).transform);
  await logo.evaluate(a => a.addEventListener('click', event => event.preventDefault(), { once: true }));
  const logoBox = await visibleLogo.boundingBox();
  await page.mouse.move(logoBox.x + logoBox.width / 2, logoBox.y + logoBox.height / 2);
  await page.mouse.down();
  await logo.evaluate(a => a.blur());
  result.logoPressAnimation = await sampleTransform(visibleLogo);
  result.logoPressed = await visibleLogo.evaluate(svg => getComputedStyle(svg).transform);
  await page.mouse.up();
  result.logoReleaseAnimation = await sampleTransform(visibleLogo);
  await toggle.focus();
  result.iconFocusAnimation = await sampleTransform(toggle.locator('svg'));
  result.toggleFocused = await toggle.evaluate(element => {
    const s = getComputedStyle(element), icon = getComputedStyle(element.querySelector('svg'));
    return { background: s.backgroundColor, color: s.color, padding: s.padding,
      icon: { fill: icon.fill, transform: icon.transform, property: icon.transitionProperty, duration: icon.transitionDuration, easing: icon.transitionTimingFunction } };
  });
  await page.locator('#main a').focus();
  result.iconBlurAnimation = await sampleTransform(toggle.locator('svg'));
  result.toggleResting = await toggle.evaluate(element => { const s = getComputedStyle(element), icon = getComputedStyle(element.querySelector('svg')); return { background: s.backgroundColor, color: s.color, fill: icon.fill, transform: icon.transform }; });

  await toggle.click();
  result.opening = await sampleTransition(panel);
  await expect(nav.getByRole('link', { name: 'Our Team', exact: true })).toBeVisible();
  const list = legacy ? panel : panel.locator('ul');
  result.expanded = await list.evaluate(element => {
    const li = element.querySelector('li'), s = getComputedStyle(li);
    return { height: element.getBoundingClientRect().height, itemHeight: li.getBoundingClientRect().height, padding: s.padding, margin: s.margin,
      links: [...element.querySelectorAll('a')].map(link => [link.textContent, link.getAttribute('href'), link.getAttribute('target'), link.getAttribute('rel')]) };
  });
  const active = nav.getByRole('link', { name: 'Blog', exact: true });
  await active.hover();
  result.activeHover = await active.evaluate(a => { const s = getComputedStyle(a); return [s.backgroundColor, s.color, s.borderBottomColor]; });
  const team = nav.getByRole('link', { name: 'Our Team', exact: true });
  await team.hover();
  result.hover = await team.evaluate(a => { const s = getComputedStyle(a); return [s.backgroundColor, s.color, s.borderBottomColor]; });
  await team.focus();
  result.linkFocus = await team.evaluate(a => { const s = getComputedStyle(a); return [s.backgroundColor, s.color, s.borderBottomColor]; });
  await toggle.click();
  result.closing = await sampleTransition(panel);
  await expect(team).toBeHidden();

  const skip = page.getByRole('link', { name: 'Skip to main content', exact: true });
  await skip.focus();
  result.skipFocus = await skip.evaluate(a => { const s = getComputedStyle(a); return [s.backgroundColor, s.color, s.boxShadow, s.fontWeight, s.position]; });
  return result;
}

test('navigation preserves the original focus effects and real expand/collapse motion', { timeout: 240000 }, async () => {
  const cms = await startFixtureCms();
  const env = { ...process.env, STRAPI_API_URL: cms.origin, STRAPI_TOKEN: fixtureToken, STRAPI_MEDIA_ORIGINS: cms.origin, ASTRO_CONTENT_MODE: 'published', PUBLIC_MAPBOX_API_KEY: '' };
  const created = [];
  let server;
  let browser;
  try {
    const original = await readFile(new URL('../fixtures/navigation/original-navigation.tsx', import.meta.url), 'utf8');
    const adapter = `import { ReactPage } from '../ReactPage';
import { Container } from '../containers';
import { Navigation as Original } from './__legacy-navigation';
import { Navigation as Current } from './navigation';
export function MotionFixture({ legacy }: { legacy: boolean }) {
  return <ReactPage pathname="/blog/" announcement={null}><header style={{background:'#1C5E38',padding:'2rem 0'}}><Container>{legacy ? <Original frontPage={false} /> : <Current frontPage={false} />}</Container></header><main id="main"><h1>Interaction fixture</h1><a href="#main">After navigation</a></main></ReactPage>;
}`;
    const route = legacy => `---\nimport SitePage from '../layouts/SitePage.astro';\nimport { MotionFixture } from '../components/header/__motion-fixture';\n---\n<SitePage title="Navigation interaction fixture" description="Local test fixture" pathname="/verification-navigation-${legacy ? 'original' : 'current'}/"><MotionFixture legacy={${legacy}} client:load /></SitePage>`;
    for (const [index, contents] of [original, adapter, route(true), route(false)].entries()) {
      await writeFile(temporary[index], contents, { flag: 'wx' });
      created.push(temporary[index]);
    }
    await build('astro.config.ts', env);
    const port = await availablePort();
    const origin = `http://127.0.0.1:${port}`;
    server = command(['node_modules/astro/bin/astro.mjs', 'preview', '--host', '127.0.0.1', '--port', String(port)], env);
    await ready(server, origin);
    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body: `@font-face{font-family:Poppins;src:url(data:font/ttf;base64,${font});font-weight:800;}` });
      return ['127.0.0.1', 'localhost'].includes(url.hostname) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const originalContract = await interactionContract(page, origin, true);
    const currentContract = await interactionContract(page, origin, false);
    // Compare effects and intermediate frames, not just final open attributes.
    for (const key of ['logoFocusAnimation', 'logoBlurAnimation', 'logoPressAnimation', 'logoReleaseAnimation', 'iconFocusAnimation', 'iconBlurAnimation', 'logoMotion', 'logoFocused', 'logoPressed', 'logoResting', 'toggleFocused', 'toggleResting', 'hover', 'activeHover', 'linkFocus', 'skipFocus']) {
      assert.deepEqual(currentContract[key], originalContract[key], key);
    }
    assert.equal(currentContract.logoFocused, 'matrix(0.8, 0, 0, 0.8, 0, 0)', 'logo actually scales on focus');
    for (const direction of ['opening', 'closing']) {
      const before = originalContract[direction], after = currentContract[direction];
      assert.equal(after.duration, before.duration, `${direction}: original duration`);
      assert.equal(after.easing, before.easing, `${direction}: original easing`);
      assert.deepEqual(after.keyframes, before.keyframes, `${direction}: original max-height range`);
      for (let i = 0; i < before.frames.length; i++) {
        assert.ok(Math.abs(after.frames[i].height - before.frames[i].height) < 1, `${direction}: visible height at frame ${i}: ${JSON.stringify({before:before.frames[i],after:after.frames[i]})}`);
      }
    }
    assert.deepEqual(currentContract.expanded.links, originalContract.expanded.links, 'all link destinations/targets retained');
    for (const field of ['height', 'itemHeight']) assert.ok(Math.abs(currentContract.expanded[field] - originalContract.expanded[field]) < 1, `expanded ${field}: ${JSON.stringify({original:originalContract.expanded,current:currentContract.expanded})}`);
    for (const field of ['padding', 'margin']) assert.equal(currentContract.expanded[field], originalContract.expanded[field]);

    // Exercise reversals and settled visibility independently of the legacy enum bug.
    await page.goto(`${origin}/verification-navigation-current/`);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    const summary = page.locator('summary'), details = page.locator('details'), panel = page.locator('.mobile-menu-content');
    await summary.focus();
    await page.keyboard.press('Escape');
    await expect(details).not.toHaveAttribute('open');
    await expect(panel).not.toHaveAttribute('data-animating');
    await summary.click();
    await expect.poll(() => panel.getAttribute('data-animating')).toBe('');
    await panel.evaluate(el => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = 300; });
    await summary.click();
    await finishAnimations(panel);
    await expect(details).not.toHaveAttribute('open');
    await expect(panel).not.toHaveAttribute('data-animating');
    await summary.evaluate(el => { el.click(); el.click(); el.click(); });
    await finishAnimations(panel);
    await expect(details).toHaveAttribute('open', '');
    await expect(panel).not.toHaveAttribute('data-animating');
    assert.equal(await panel.evaluate(el => getComputedStyle(el).maxHeight), 'none');
    // Reverse a closing transition without hiding or clipping the reopened links.
    await summary.click();
    await panel.evaluate(el => { const a = el.getAnimations()[0]; a.pause(); a.currentTime = 300; });
    await summary.click();
    await finishAnimations(panel);
    await expect(details).toHaveAttribute('open', '');
    await expect(panel).not.toHaveAttribute('data-animating');
    assert.equal(await panel.evaluate(el => el.inert), false);
    assert.equal(await panel.evaluate(el => getComputedStyle(el).maxHeight), 'none');
    await summary.click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect(details).not.toHaveAttribute('open');
    await expect(panel).not.toHaveAttribute('data-animating');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(details).not.toHaveAttribute('open');
    // A preference change during motion settles the requested state immediately.
    await summary.click();
    await expect(panel).toHaveAttribute('data-animating', '');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(details).toHaveAttribute('open', '');
    await expect(panel).not.toHaveAttribute('data-animating');
    await summary.click();
    await expect(details).not.toHaveAttribute('open');
    await summary.click();
    await expect(panel).not.toHaveAttribute('data-animating');
    await summary.click();
    await expect(details).not.toHaveAttribute('open');
    // Pointer exits must not leave a remembered link that steals focus on resize.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.desktop-links a').first().focus();
    await page.locator('#main h1').click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(summary).not.toBeFocused();
    await summary.focus();
    await page.locator('#main h1').click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('.desktop-links a').first()).not.toBeFocused();
    // Run the same navigation journey used by media.spec.js at both viewports.
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await navigationHelpers.checkResponsiveNavigation(page, `${origin}/verification-navigation-current/`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser?.close();
    await stop(server);
    await cms.close();
    await Promise.all(created.map(file => unlink(file)));
  }
});
