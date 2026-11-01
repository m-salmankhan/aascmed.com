// Compare server layout with delayed fonts/scripts, then real hydration and native interaction.
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, expect } from '@playwright/test';
import { startFixtureCms, fixtureToken } from '../fixtures/astro-cms/server.mjs';
import { availablePort, command, build, ready, stop } from '../fixtures/astro-cms/process.mjs';
import { navigationRowWidthRem } from '../../src/components/header/generated-navigation-metrics.mts';
import { navigationSizing } from '../../src/components/header/navigation-config.mts';

const gates = [];

function gate() {
  let release;
  const promise = new Promise(resolve => { release = resolve; });
  const result = { promise, release };
  gates.push(result);
  return result;
}

async function geometry(nav) {
  return nav.evaluate(element => {
    const rect = node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(n => Math.round(n * 10) / 10); };
    const list = element.querySelector('.desktop-links');
    const mobile = getComputedStyle(list).display === 'none';
    const logo = [...element.querySelectorAll('.brand svg')].find(svg => getComputedStyle(svg).display !== 'none');
    return { mobile, nav: rect(element), brand: rect(element.querySelector('.brand')), logo: rect(logo), list: rect(list),
      links: mobile ? [] : [...list.querySelectorAll('a')].map(rect), main: rect(document.querySelector('#main')) };
  });
}

test('navigation has its final layout before fonts or hydration, at different root sizes and zoom geometries', { timeout: 240000 }, async () => {
  const cms = await startFixtureCms();
  const env = { ...process.env, STRAPI_API_URL: cms.origin, STRAPI_TOKEN: fixtureToken, STRAPI_MEDIA_ORIGINS: cms.origin,
    ASTRO_CONTENT_MODE: 'published', PUBLIC_MAPBOX_API_KEY: '' };
  let server;
  let staticServer;
  let browser;
  try {
    await build('astro.config.ts', env);
    await build('astro.config.ssr.ts', env);
    const port = await availablePort();
    const ssrOrigin = `http://127.0.0.1:${port}`;
    server = command(['dist-ssr/server/entry.mjs'], { ...env, HOST: '127.0.0.1', PORT: String(port) });
    await ready(server, ssrOrigin);
    const staticPort = await availablePort();
    const staticOrigin = `http://127.0.0.1:${staticPort}`;
    staticServer = command(['node_modules/astro/bin/astro.mjs', 'preview', '--config', 'astro.config.ts',
      '--host', '127.0.0.1', '--port', String(staticPort)], env);
    await ready(staticServer, staticOrigin);
    browser = await chromium.launch();
    for (const origin of [staticOrigin, ssrOrigin]) {
      for (const javaScriptEnabled of [true, false]) {
        for (const root of [16, 24, 32]) {
          const context = await browser.newContext({ javaScriptEnabled });
          let scripts = gate();
          let fonts = gate();
          await context.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return route.abort();
            if (/\.(?:m?js)$/.test(url.pathname)) await scripts.promise;
            if (/\.ttf$/.test(url.pathname)) await fonts.promise;
            if (url.origin === origin && ['/', '/privacy/'].includes(url.pathname)) {
              const response = await route.fetch();
              return route.fulfill({ response, body: (await response.text()).replace('</head>', `<style>html{font-size:${root}px !important}</style></head>`) });
            }
            return route.continue();
          });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => {
            if (message.type() === 'error' && /hydration|hydrating|did not match|extra attributes|server html/i.test(message.text())) errors.push(message.text());
          });
          for (const width of [390, 960, 1280, 1440, 3440]) {
            // A fresh page tests the SSR geometry before the JavaScript module runs.
            scripts = gate(); fonts = gate();
            await page.setViewportSize({ width, height: 1000 });
            const path = width === 1440 ? '/' : '/privacy/';
            await page.goto(`${origin}${path}`, { waitUntil: 'commit' });
            const nav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
            await expect(nav).toBeVisible();
            await expect(page.locator('#main')).toBeAttached();
            await expect(nav.locator('.desktop-links li')).toHaveCount(8);
            const initial = await geometry(nav);
            if (initial.mobile) {
              // Native controls must work while the application's modules and font
              // are still blocked, and hydration must preserve this user action.
              await nav.locator('summary').focus();
              await page.keyboard.press('Enter');
              await expect(nav.locator('details')).toHaveAttribute('open', '');
            }
            const before = await geometry(nav);
            const available = before.nav[2];
            assert.equal(before.mobile, available + 0.1 < navigationRowWidthRem * root, `CSS collapse at ${width}px / root ${root}px`);
            fonts.release();
            await page.evaluate(() => document.fonts.ready);
            assert.deepEqual(await geometry(nav), before, 'font loading does not move the navbar, links or main content');
            scripts.release();
            if (javaScriptEnabled) await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
            assert.deepEqual(await geometry(nav), before, 'hydration does not change initial layout');
            if (!before.mobile) {
              const row = await nav.locator('.desktop-links li').evaluateAll(items => items.map(item => item.getBoundingClientRect().top));
              assert.ok(row.every(y => Math.abs(y - row[0]) < 1), 'normal text stays on a single row');
              assert.ok(before.list[0] >= before.nav[0] - 1 && before.list[0] + before.list[2] <= before.nav[0] + available + 1);
              const alongside = available >= (navigationRowWidthRem + navigationSizing.logoWidth + navigationSizing.headerGap) * root;
              if (alongside) {
                assert.ok(Math.abs(before.list[1] + before.list[3] / 2 - (before.brand[1] + before.brand[3] / 2)) < 1, 'row beside logo when it fits');
                assert.ok(Math.abs(before.logo[0] - before.nav[0]) < 1, 'logo aligns with the left content edge beside navigation');
              } else {
                assert.ok(before.list[1] >= before.brand[1] + before.brand[3], 'centered row below logo when it only fits there');
                assert.ok(Math.abs(before.logo[0] + before.logo[2] / 2 - (before.nav[0] + available / 2)) < 1, 'logo stays centered above the row');
              }
              assert.ok(Math.abs(before.brand[2] - before.logo[2]) < 1, 'brand wrapper stays tight to the visible logo');
            } else {
              assert.ok(Math.abs(before.logo[0] + before.logo[2] / 2 - (before.nav[0] + available / 2)) < 1, 'mobile logo stays centered');
              const summary = nav.locator('summary');
              const details = nav.locator('details');
              await expect(details).toHaveAttribute('open', '');
              await summary.focus();
              await page.keyboard.press('Enter');
              await expect(details).not.toHaveAttribute('open');
              await page.keyboard.press('Enter');
              await expect(details).toHaveAttribute('open', '');
              await expect(nav.getByRole('link', { name: 'Blog', exact: true })).toBeVisible();
              await page.keyboard.press('Enter');
              await expect(details).not.toHaveAttribute('open');
            }
            const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
              nodes: [...document.querySelectorAll('body *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== 'absolute').slice(0, 5).map(el => [el.tagName, el.className, el.textContent?.slice(0, 70)]) }));
            assert.ok(overflow.scroll <= overflow.width + 1, `no page overflow at ${width}px / root ${root}px: ${JSON.stringify(overflow)}`);
          }
          // Independent text enlargement must preserve access even if it exceeds
          // the font-relative slots measured for the normal navigation font size.
          await page.evaluate(() => {
            const style = document.createElement('style');
            style.textContent = 'nav[aria-label="Main navigation"] li { font-size: 2rem; }';
            document.head.append(style);
          });
          const desktop = page.locator('.desktop-links');
          const textBounds = await desktop.evaluate(list => {
            const r = list.getBoundingClientRect();
            return [...list.querySelectorAll('a')].every(link => {
              const b = link.getBoundingClientRect();
              return b.left >= r.left - 1 && b.right <= r.right + 1 && b.top >= r.top - 1 && b.bottom <= r.bottom + 1
                && link.scrollWidth <= link.clientWidth + 1;
            });
          });
          assert.equal(textBounds, true, 'all enlarged-text links remain fully visible without clipping');
          const desktopLinks = desktop.getByRole('link');
          await desktopLinks.first().focus();
          for (let index = 0; index < 8; index++) {
            await expect(desktopLinks.nth(index)).toBeFocused();
            await page.keyboard.press('Tab');
          }
          // Emulate the layout geometry of 200% browser zoom: half the CSS
          // viewport and double DPR, independently of root-font preferences.
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 500, deviceScaleFactor: 2, mobile: false });
          const summary = page.locator('summary');
          await expect(summary).toBeVisible();
          assert.equal(await page.evaluate(() => devicePixelRatio), 2);
          const nativeMenu = page.locator('.mobile-menu');
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await summary.click();
          await summary.click();
          await expect(nativeMenu).not.toHaveAttribute('open');
          if (javaScriptEnabled) {
            await summary.click();
            await page.keyboard.press('Escape');
            await expect(summary).toBeFocused();
            await expect(nativeMenu).not.toHaveAttribute('open');
            await summary.click();
            await cdp.send('Emulation.setDeviceMetricsOverride', { width: 3440, height: 1000, deviceScaleFactor: 1, mobile: false });
            await expect(desktopLinks.first()).toBeFocused();
            await expect(nativeMenu).not.toHaveAttribute('open');
            await cdp.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 500, deviceScaleFactor: 2, mobile: false });
            await expect(summary).toBeFocused();
          }
          assert.deepEqual(errors, [], 'no client/hydration errors');
          gates.forEach(item => item.release());
          await context.close();
        }
      }
    }
  } finally {
    gates.forEach(item => item.release());
    await browser?.close();
    await Promise.all([stop(server), stop(staticServer)]);
    await cms.close();
  }
});
