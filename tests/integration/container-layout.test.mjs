// Verify the shared container geometry in real production output, independently of navigation.
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, expect } from '@playwright/test';
import { startFixtureCms, fixtureToken } from '../fixtures/astro-cms/server.mjs';
import { availablePort, command, build, ready, stop } from '../fixtures/astro-cms/process.mjs';

test('content widths grow smoothly to their cap while full-bleed sections remain full width', { timeout: 240000 }, async () => {
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
    for (const [output, origin] of [['static', staticOrigin], ['SSR', ssrOrigin]]) {
      for (const javaScriptEnabled of [true, false]) {
        const context = await browser.newContext({ javaScriptEnabled });
        await context.route('**/*', route => ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
          ? route.continue() : route.abort());
        const page = await context.newPage();
        for (const path of ['/', '/privacy/', '/clinics/']) {
          assert.equal((await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' })).status(), 200);
          if (javaScriptEnabled) await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
          let previous;
          for (const width of [320, 390, 479, 480, 768, 959, 960, 1024, 1280, 1439, 1440, 1599, 1600, 1920, 3440, 5120]) {
            await page.setViewportSize({ width, height: 1000 });
            const dimensions = await page.evaluate(() => {
              const content = document.querySelector('footer > div').getBoundingClientRect();
              return { content: content.toJSON(), overflow: document.documentElement.scrollWidth - innerWidth };
            });
            const label = `${output}, ${path}, JS=${javaScriptEnabled}, ${width}px`;
            assert.ok(dimensions.overflow <= 1, `${label}: no horizontal overflow`);
            assert.ok(dimensions.content.left >= 15.5, `${label}: at least 1rem gutters`);
            assert.ok(dimensions.content.width <= 1281, `${label}: content capped at 80rem`);
            assert.ok(Math.abs(dimensions.content.left - (width - dimensions.content.right)) < 1, `${label}: centered`);
            if (width >= 1440) assert.ok(Math.abs(dimensions.content.width - 1280) < 1, `${label}: cap reached`);
            if (previous) {
              const growth = dimensions.content.width - previous.contentWidth;
              assert.ok(growth >= -1 && growth <= width - previous.width + 1, `${label}: no breakpoint jumps`);
            }
            previous = { width, contentWidth: dimensions.content.width };
            if (path === '/' || path === '/clinics/') {
              const mapSizing = await page.locator('#main img.map').first().evaluate(image => {
                const entries = [];
                let depth = 0;
                let start = 0;
                for (let index = 0; index < image.sizes.length; index++) {
                  const character = image.sizes[index];
                  if (character === '(') depth++;
                  if (character === ')') depth--;
                  if (character === ',' && depth === 0) {
                    entries.push(image.sizes.slice(start, index).trim());
                    start = index + 1;
                  }
                }
                entries.push(image.sizes.slice(start).trim());
                const selected = entries.find(entry => {
                  const media = entry.match(/^\(min-width: [\d.]+em\)/);
                  return !media || matchMedia(media[0]).matches;
                });
                const probe = document.createElement('div');
                probe.style.width = selected.replace(/^\(min-width: [\d.]+em\)\s*/, '');
                probe.style.position = 'absolute';
                document.body.append(probe);
                const hinted = probe.getBoundingClientRect().width;
                probe.remove();
                return { hinted, actual: image.getBoundingClientRect().width };
              });
              assert.ok(mapSizing.hinted >= mapSizing.actual - 1,
                `${label}: responsive map size must not understate its rendered width (${JSON.stringify(mapSizing)})`);
              assert.ok(mapSizing.hinted <= mapSizing.actual + 33,
                `${label}: responsive map size accounts for gutters and the content cap (${JSON.stringify(mapSizing)})`);
            }
            if (path === '/') {
              const hero = await page.locator('header nav').first().evaluate(nav => {
                const section = nav.closest('header').parentElement;
                const bounds = section.getBoundingClientRect();
                return { left: bounds.left, right: bounds.right, contentLeft: bounds.left + parseFloat(getComputedStyle(section).paddingLeft) };
              });
              assert.equal(hero.left, 0, `${label}: hero begins at viewport edge`);
              assert.equal(hero.right, width, `${label}: hero fills viewport`);
              assert.ok(Math.abs(hero.contentLeft - dimensions.content.left) < 1, `${label}: padded and regular containers align`);
            }
          }
        }
        await context.close();
      }
    }
  } finally {
    await browser?.close();
    await Promise.all([stop(server), stop(staticServer)]);
    await cms.close();
  }
});
