// Checks real React hydration, navigation, notices and synthetic contact submissions in Astro output.
import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, expect } from '@playwright/test';
import { startFixtureCms, fixtureToken } from '../fixtures/astro-cms/server.mjs';
import { availablePort, command, build, ready, stop } from '../fixtures/astro-cms/process.mjs';
/** Navigate to actual server HTML and wait for every load-hydrated React island.
 * @param page Playwright browser page.
 * @param url Local Astro page URL.
 * @returns Initial server response after the page has hydrated successfully.
 */
async function openHydrated(page, url) {
  const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200, url);
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0, { timeout: 15000 });
  return response;
}
/** Fill the real contact form with public synthetic data and submit through the fixture HTTP API.
 * @param page Browser on the hydrated contact page.
 * @returns After the contact API responds to the submission.
 */
async function submitContact(page) {
  const form = page.locator('form').filter({ has: page.locator('input[name="subject"]') });
  await form.locator('input[name="subject"]').fill('Synthetic browser enquiry');
  await form.locator('input[name="fullname"]').fill('Example Test Person');
  await form.locator('input[name="email"]').fill('example@example.com');
  await form.locator('input[name="phone"]').fill('555-0100');
  await form.locator('textarea[name="message"]').fill('Synthetic test data only.');
  await form.locator('select[name="clinic"]').selectOption({ index: 1 });
  await form.locator('input[name="new_patient"]').check();
  await form.locator('input[name="disclaimer"]').check();
  const response = page.waitForResponse(
    (item) =>
      new URL(item.url()).pathname === '/runtime/contact/' && item.request().method() === 'POST',
  );
  await form.getByRole('button', { name: 'Send Message', exact: true }).click();
  return response;
}
test(
  'real Astro pages hydrate shared interactions without client errors or external form delivery',
  { timeout: 240000 },
  async () => {
    const cms = await startFixtureCms();
    cms.published['service-updates'][0].date = '2026-11-01T00:30:00.000Z';
    const env = {
      ...process.env,
      DEBUG: '',
      TZ: 'UTC',
      GATSBY_STRAPI_API_URL: cms.origin,
      STRAPI_TOKEN: fixtureToken,
      STRAPI_MEDIA_ORIGINS: cms.origin,
      ASTRO_CONTENT_MODE: 'published',
      PUBLIC_RUNTIME_API_BASE_URL: `${cms.origin}/runtime`,
      PUBLIC_MAPBOX_API_KEY: '',
      GATSBY_MAPBOX_API_KEY: '',
    };
    let server;
    let browser;
    try {
      await build('astro.config.static.ts', env);
      await build('astro.config.ssr.ts', env);
      const port = await availablePort();
      const origin = `http://127.0.0.1:${port}`;
      server = command(['dist-ssr/server/entry.mjs'], {
        ...env,
        HOST: '127.0.0.1',
        PORT: String(port),
      });
      await ready(server, origin);
      browser = await chromium.launch();
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        timezoneId: 'America/Chicago',
      });
      await context.route('**/*', (route) =>
        ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
          ? route.continue()
          : route.abort(),
      );
      const errors = [];
      context.on('page', (page) => {
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (
            message.type() === 'error' &&
            /hydration|hydrating|did not match|server HTML|Minified React error #(418|423|425)/i.test(
              message.text(),
            )
          ) {
            errors.push(message.text());
          }
        });
      });
      const page = await context.newPage();
      assert.equal(
        await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
        'America/Chicago',
      );
      const datedResponse = await openHydrated(page, `${origin}/service-updates/2026/11/notice/`);
      assert.ok(
        (await datedResponse.text()).includes('1st November 2026'),
        'SSR retains the CMS calendar date',
      );
      await expect(page.getByText('1st November 2026', { exact: true })).toBeVisible();
      await expect(page.locator('a[href="/service-updates/2026/11/notice/"]')).toHaveAttribute(
        'aria-current',
        'page',
      );
      await openHydrated(page, `${origin}/contact/`);
      const toggle = page.getByRole('button', { name: 'Menu', exact: true });
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.locator('nav').getByRole('link', { name: 'Blog', exact: true }).click();
      await page.waitForURL('**/blog/');
      await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
      await expect(
        page.locator('nav').getByRole('link', { name: 'Blog', exact: true, includeHidden: true }),
      ).toHaveAttribute('aria-current', 'page');
      await openHydrated(page, `${origin}/contact/`);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      const notice = page.locator('aside').filter({ hasText: 'PUBLISHED ANNOUNCEMENT' });
      await expect(notice).toBeVisible();
      await notice.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(notice).toHaveCount(0);
      assert.equal(
        await page.evaluate(() => sessionStorage.getItem('announcementDismissed')),
        'true',
      );
      cms.runtime.mode = 'validation';
      assert.equal((await submitContact(page)).status(), 400);
      await expect(page.getByText('Fixture email was rejected', { exact: true })).toBeVisible();
      cms.runtime.mode = 'error';
      assert.equal((await submitContact(page)).status(), 503);
      await expect(page.getByText(/An unexpected error occurred/)).toBeVisible();
      cms.runtime.mode = 'success';
      assert.equal((await submitContact(page)).status(), 200);
      await expect(page.getByText(/Message successfully sent!/)).toBeVisible();
      assert.equal(cms.runtime.requests.length, 3);
      const sent = cms.runtime.requests.at(-1);
      assert.equal(
        sent.authorization,
        undefined,
        'the CMS bearer token never enters contact submissions',
      );
      assert.equal(sent.body.full_name, 'Example Test Person');
      assert.equal(sent.body.newPatient, true);
      assert.equal(sent.body.disclaimer, true);
      assert.equal(sent.body.source_url, `${origin}/contact/`);
      await openHydrated(page, `${origin}/`);
      await expect(page.getByRole('button', { name: 'Dismiss', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Dismiss', exact: true })).toHaveCount(0);
      const next = page.getByRole('button', { name: /^next$/i });
      await next.scrollIntoViewIfNeeded();
      const before = await page.locator('.carousel__slide--visible').innerText();
      await next.click();
      await expect
        .poll(() => page.locator('.carousel__slide--visible').innerText())
        .not.toBe(before);
      await page.getByRole('button', { name: /^previous$/i }).click();
      await expect.poll(() => page.locator('.carousel__slide--visible').innerText()).toBe(before);
      const storedContext = await browser.newContext();
      await storedContext.route('**/*', (route) =>
        ['localhost', '127.0.0.1'].includes(new URL(route.request().url()).hostname)
          ? route.continue()
          : route.abort(),
      );
      await storedContext.addInitScript(() =>
        sessionStorage.setItem('announcementDismissed', 'true'),
      );
      const storedPage = await storedContext.newPage();
      storedPage.on('pageerror', (error) => errors.push(error.message));
      storedPage.on('console', (message) => {
        if (
          message.type() === 'error' &&
          /hydration|hydrating|did not match|server HTML|Minified React error #(418|423|425)/i.test(
            message.text(),
          )
        ) {
          errors.push(message.text());
        }
      });
      const storedResponse = await openHydrated(storedPage, `${origin}/privacy/`);
      assert.ok(
        (await storedResponse.text()).includes('PUBLISHED ANNOUNCEMENT'),
        'the server renders a deterministic notice before client storage is read',
      );
      await expect(
        storedPage.locator('aside').filter({ hasText: 'PUBLISHED ANNOUNCEMENT' }),
      ).toHaveCount(0);
      assert.deepEqual(
        errors,
        [],
        'all pages and stored-dismissal hydration must remain error-free',
      );
      await storedContext.close();
      await context.close();
    } finally {
      await browser?.close();
      await stop(server);
      await cms.close();
    }
  },
);
