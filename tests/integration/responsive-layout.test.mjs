// Exercise actual production HTML/CSS and React navigation with and without JavaScript.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { chromium, expect } from '@playwright/test';
import { startFixtureCms, fixtureToken } from '../fixtures/astro-cms/server.mjs';
import { availablePort, command, build, ready, stop } from '../fixtures/astro-cms/process.mjs';

const font = await readFile(new URL('../../src/server/media/assets/Poppins-ExtraBold.ttf', import.meta.url));

async function openPage(page, origin, path, javaScriptEnabled) {
  assert.equal((await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' })).status(), 200);
  if (javaScriptEnabled) await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
}

async function assertRow(nav, layout) {
  const bounds = await nav.evaluate(element => {
    const list = element.querySelector('.js-navigation ul');
    const items = [...list.children].map(item => item.getBoundingClientRect().toJSON());
    return {
      nav: element.getBoundingClientRect().toJSON(),
      logo: element.querySelector('[data-logo]').getBoundingClientRect().toJSON(),
      list: list.getBoundingClientRect().toJSON(),
      items,
    };
  });
  assert.ok(bounds.items.every(item => Math.abs(item.top - bounds.items[0].top) < 1), 'links stay on one row');
  assert.ok(bounds.list.left >= bounds.nav.left - 1 && bounds.list.right <= bounds.nav.right + 1, 'row fits its container');
  if (layout === 'right') {
    assert.ok(bounds.list.left > bounds.logo.right, 'links sit beside the logo');
    assert.ok(Math.abs(bounds.list.right - bounds.nav.right) < 1, 'row aligns right');
  } else {
    assert.ok(bounds.list.top >= bounds.logo.bottom, 'centered row sits below the logo');
    assert.ok(Math.abs((bounds.list.left + bounds.list.right) / 2 - (bounds.nav.left + bounds.nav.right) / 2) < 1);
  }
}

test('capped content, full-bleed backgrounds and three navigation layouts retain keyboard and no-JS access', { timeout: 240000 }, async () => {
  const cms = await startFixtureCms();
  const env = {
    ...process.env,
    STRAPI_API_URL: cms.origin,
    STRAPI_TOKEN: fixtureToken,
    STRAPI_MEDIA_ORIGINS: cms.origin,
    ASTRO_CONTENT_MODE: 'published',
    PUBLIC_MAPBOX_API_KEY: '',
  };
  let server;
  let browser;
  try {
    await build('astro.config.ts', env);
    await build('astro.config.ssr.ts', env);
    const port = await availablePort();
    const origin = `http://127.0.0.1:${port}`;
    server = command(['dist-ssr/server/entry.mjs'], { ...env, HOST: '127.0.0.1', PORT: String(port) });
    await ready(server, origin);
    browser = await chromium.launch();
    for (const javaScriptEnabled of [true, false]) {
      const context = await browser.newContext({ javaScriptEnabled, viewport: { width: 390, height: 1000 } });
      // Test the actual brand font without depending on Google Fonts or other external services.
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/responsive-poppins.ttf') return route.fulfill({ contentType: 'font/ttf', body: font });
        if (url.hostname === 'fonts.googleapis.com') return route.fulfill({ contentType: 'text/css', body:
          `@font-face { font-family: Poppins; font-weight: 800; font-display: swap; src: url('${origin}/responsive-poppins.ttf'); }` });
        return ['localhost', '127.0.0.1'].includes(url.hostname) ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const path of ['/', '/privacy/']) {
        await openPage(page, origin, path, javaScriptEnabled);
        const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
        const toggle = nav.getByRole('button', { name: 'Menu', exact: true });
        for (const width of [320, 390, 768, 1024, 1152, 1280, 1440, 1920, 3440]) {
          await page.setViewportSize({ width, height: 1000 });
          if (javaScriptEnabled) {
            const layout = width < 1024 ? 'collapsed' : width < 1440 ? 'centered' : 'right';
            await expect(nav).toHaveAttribute('data-layout', layout);
            if (layout === 'collapsed') {
              await expect(toggle).toBeVisible();
              await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeHidden();
            } else {
              await expect(toggle).toBeHidden();
              await expect(nav.locator('.menu-content')).toHaveAttribute('aria-hidden', 'false');
              await assertRow(nav, layout);
            }
          } else if (width < 1152) {
            const summary = nav.locator('summary');
            await expect(summary).toBeVisible();
            await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeHidden();
            await summary.focus();
            await page.keyboard.press('Enter');
            await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeVisible();
            await page.keyboard.press('Enter');
          } else {
            await expect(nav.locator('summary')).toBeHidden();
            await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeVisible();
            const row = await nav.locator('.fallback-links li').evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
            assert.ok(row.every(top => Math.abs(top - row[0]) < 1), 'no-JS desktop links remain on one row');
            const positions = await nav.evaluate(element => ({
              logo: element.querySelector('[data-logo]').getBoundingClientRect().toJSON(),
              list: element.querySelector('.fallback-links').getBoundingClientRect().toJSON(),
              nav: element.getBoundingClientRect().toJSON(),
            }));
            if (width >= 1440) assert.ok(positions.list.left > positions.logo.right, 'no-JS links sit on the right when they fit');
            else assert.ok(Math.abs((positions.list.left + positions.list.right) / 2 - (positions.nav.left + positions.nav.right) / 2) < 1, 'no-JS full row is centered below the logo');
          }
          const dimensions = await page.evaluate(() => {
            const footerContent = document.querySelector('footer > div').getBoundingClientRect();
            return { viewport: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth, content: footerContent.toJSON() };
          });
          assert.ok(dimensions.overflow <= 1, `${javaScriptEnabled} ${path} at ${width}: no horizontal overflow`);
          assert.ok(dimensions.content.width <= 1281, 'shared content is capped at 80rem');
          assert.ok(dimensions.content.left >= 15.5, 'at least 1rem page gutters');
          if (width >= 1440) assert.ok(Math.abs(dimensions.content.width - 1280) < 1);
          if (path === '/') {
            const hero = await nav.evaluate(element => {
              const section = element.closest('header').parentElement;
              const rect = section.getBoundingClientRect();
              const styles = getComputedStyle(section);
              return { left: rect.left, right: rect.right, contentLeft: rect.left + parseFloat(styles.paddingLeft), navLeft: element.getBoundingClientRect().left };
            });
            assert.equal(hero.left, 0);
            assert.equal(hero.right, width);
            assert.ok(Math.abs(hero.contentLeft - hero.navLeft) < 1, 'full-bleed content follows the same gutter');
          }
        }
        if (javaScriptEnabled) {
          await page.setViewportSize({ width: 390, height: 1000 });
          await expect(toggle).toBeVisible();
          await toggle.click();
          await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeVisible();
          // Reverse an in-flight transition repeatedly: visibility cannot depend on transitionend.
          await toggle.evaluate(button => { button.click(); button.click(); button.click(); });
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeHidden();
          await toggle.focus();
          await page.keyboard.press('Enter');
          await page.keyboard.press('Tab');
          await expect(nav.getByRole('link', { name: 'Patient Education', exact: true })).toBeFocused();
          await page.keyboard.press('Escape');
          await expect(toggle).toBeFocused();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await toggle.click();
          await toggle.click();
          await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeHidden();
          await toggle.click();
          await page.setViewportSize({ width: 1440, height: 1000 });
          await expect(nav).toHaveAttribute('data-layout', 'right');
          await expect(nav.getByRole('link', { name: 'Patient Education', exact: true })).toBeFocused();
          await page.setViewportSize({ width: 390, height: 1000 });
          await expect(toggle).toBeFocused();
          await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        } else {
          await page.setViewportSize({ width: 390, height: 1000 });
          await nav.locator('summary').click();
          await nav.getByRole('link', { name: 'Blog', exact: true }).click();
          await page.waitForURL(`${origin}/blog/`);
        }
      }
      if (javaScriptEnabled) {
        await page.setViewportSize({ width: 1152, height: 1000 });
        await openPage(page, origin, '/privacy/', true);
        const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
        await expect(nav).toHaveAttribute('data-layout', 'centered');
        // Changing font metrics after hydration must recalculate the layout.
        await page.addStyleTag({ content: 'nav[aria-label="Main navigation"] li { font-size: 1.5rem; }' });
        await expect(nav).toHaveAttribute('data-layout', 'collapsed');
        const menu = nav.getByRole('button', { name: 'Menu', exact: true });
        await menu.click();
        await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeVisible();
        await page.addStyleTag({ content: 'nav[aria-label="Main navigation"] li { font-size: 1rem; } nav[aria-label="Main navigation"] a { font-family: Arial; }' });
        await page.setViewportSize({ width: 960, height: 1000 });
        await expect(nav).toHaveAttribute('data-layout', 'centered');
        await page.evaluate(async () => {
          const face = new FontFace('Late navigation font', 'url(/responsive-poppins.ttf)', { weight: '800' });
          document.fonts.add(face);
          const style = document.createElement('style');
          style.textContent = 'nav[aria-label="Main navigation"] a { font-family: "Late navigation font", Arial; }';
          document.head.append(style);
          await face.load();
          await document.fonts.ready;
        });
        await expect(nav).toHaveAttribute('data-layout', 'collapsed');
        await expect(menu).toHaveAttribute('aria-expanded', 'false');
      }
      assert.deepEqual(errors, [], 'no runtime or hydration errors');
      await context.close();
    }
  } finally {
    await browser?.close();
    await stop(server);
    await cms.close();
  }
});
