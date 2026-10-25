const { test, expect } = require("./fixtures");
const { openPage, preparePage, dismissBooking } = require("./helpers");

async function fillContact(page) {
  await page.getByLabel(/^Subject/).fill("Regression test - intercepted");
  await page.getByLabel(/^Full Name/).fill("Regression Test");
  await page.getByLabel(/^Email Address/).fill("regression@example.invalid");
  await page.getByLabel(/^Phone Number/).fill("2025550100");
  await page.getByLabel(/^Your message/).fill("Synthetic browser test. No real submission.");
  const clinic = page.locator('select[name="clinic"]');
  let value;
  if (await clinic.count()) {
    value = await clinic.locator("option:not([disabled])").first().getAttribute("value");
    await clinic.selectOption(value);
  } else {
    value = await page.locator('input[type="hidden"][name="clinic"]').inputValue();
  }
  await page.getByLabel("I am a new patient").check();
  await page.getByLabel(/I confirm that the above message/).check();
  return value;
}

test("contact required fields prevent submission", async ({ page, baseURL }) => {
  await preparePage(page, new URL("/contact/", baseURL).href);
  await page.getByRole("button", { name: "Send Message" }).click();
  expect(await page.locator("form").evaluate(form => form.checkValidity())).toBe(false);
  await expect(page.getByLabel(/^Subject/)).toBeFocused();
});

for (const path of ["/contact/", "/", "/clinics/crest-hill/"]) {
test(`${path} contact sends the expected payload and displays success without sending email`, async ({ page, baseURL }) => {
  const submissions = [];
  await page.route("**/contact/", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await preparePage(page, new URL(path, baseURL).href);
  const clinic = await fillContact(page);
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText("Message successfully sent!", { exact: false })).toBeVisible();
  expect(submissions).toEqual([{
    subject: "Regression test - intercepted", full_name: "Regression Test",
    email_address: "regression@example.invalid", phone_number: "2025550100",
    clinic, message: "Synthetic browser test. No real submission.",
    newPatient: true, disclaimer: true, source_url: new URL(path, baseURL).href,
  }]);
});
}

test("contact field errors preserve input and allow a successful retry", async ({ page, baseURL }) => {
  let attempts = 0;
  await page.route("**/contact/", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    attempts++;
    await route.fulfill({
      status: attempts === 1 ? 400 : 200,
      contentType: "application/json",
      body: attempts === 1 ? JSON.stringify({ detail: { field_errors: { phone_number: ["Test phone validation error"] } } }) : "{}",
    });
  });
  await preparePage(page, new URL("/contact/", baseURL).href);
  await fillContact(page);
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText("Test phone validation error")).toBeVisible();
  await expect(page.getByLabel(/^Full Name/)).toHaveValue("Regression Test");
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText("Message successfully sent!", { exact: false })).toBeVisible();
  expect(attempts).toBe(2);
});

test("contact server failure displays an error, never a success notice", async ({ page, baseURL }) => {
  await page.route("**/contact/", async route => {
    if (route.request().method() !== "POST") return route.fallback();
    await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
  });
  await preparePage(page, new URL("/contact/", baseURL).href);
  await fillContact(page);
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByText("An unexpected error occurred.", { exact: false })).toBeVisible();
  await expect(page.getByText("Message successfully sent!", { exact: false })).toHaveCount(0);
});

test("booking dismiss works by keyboard and the booking CTA hands off to Zocdoc", async ({ page, context, baseURL }) => {
  let scriptRequested = false;
  let bookingURL;
  await context.route("https://offsiteschedule.zocdoc.com/plugin/embed", async route => {
    scriptRequested = true;
    await route.fulfill({ contentType: "application/javascript", body: "/* isolated booking handoff smoke */" });
  });
  await context.route("https://www.zocdoc.com/practice/**", async route => {
    bookingURL = route.request().url();
    await route.fulfill({ contentType: "text/html", body: "<h1>Booking handoff intercepted</h1>" });
  });
  await openPage(page, baseURL);
  await expect(page.getByRole("button", { name: "Dismiss", exact: true })).toBeVisible();
  await dismissBooking(page);
  await expect.poll(() => scriptRequested).toBe(true);
  await page.getByRole("link", { name: "Book online", exact: true }).click();
  await expect.poll(() => bookingURL).toMatch(/^https:\/\/www\.zocdoc\.com\/practice\/allergy-asthma-and-sinus-centers-3233\?/);
  expect(new URL(bookingURL).searchParams.get("lock")).toBe("true");
});

test("responsive menu opens, closes and supports keyboard navigation", async ({ page, baseURL }) => {
  await preparePage(page, baseURL);
  const menu = page.getByRole("button", { name: "Menu", exact: true });
  if (await menu.isVisible()) {
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true");
  }
  const contact = page.locator('nav a[href="/contact/"]').first();
  await contact.focus();
  await contact.press("Enter");
  await expect(page).toHaveURL(new URL("/contact/", baseURL).href);
  await expect(page.getByRole("button", { name: "Send Message" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(baseURL);
});

for (const family of ["blog", "conditions", "providers", "clinics", "service-updates"]) {
  test(`${family} archive opens a detail page and preserves browser back navigation`, async ({ page, baseURL }) => {
    const archive = new URL(`/${family}/`, baseURL).href;
    await preparePage(page, archive);
    const card = page.locator(`#main a[href^="/${family}/"]:not([href="/${family}/"])`).first();
    const href = await card.getAttribute("href");
    expect(href).not.toBe(`/${family}/`);
    await card.click();
    await expect(page).toHaveURL(new URL(href, baseURL).href);
    await expect(page.locator("#main")).not.toHaveText("");
    await page.goBack();
    await expect(page).toHaveURL(archive);
  });
}

test("article contents links point to real headings and navigate to them", async ({ page, baseURL }) => {
  await preparePage(page, new URL("/conditions/food-allergy/", baseURL).href);
  const contents = page.locator("section").filter({ has: page.getByRole("heading", { name: "Contents", exact: true }) });
  const links = contents.locator('a[href*="#"]');
  await expect(links.first()).toBeVisible();
  for (const link of await links.all()) {
    const href = await link.getAttribute("href");
    await expect(page.locator(`[id="${new URL(href, baseURL).hash.slice(1)}"]`)).toHaveCount(1);
  }
  const href = await links.first().getAttribute("href");
  await links.first().click();
  await expect(page).toHaveURL(new URL(href, page.url()).href);
});

test("review carousel next and back change the active review", async ({ page, baseURL }) => {
  await preparePage(page, baseURL);
  const next = page.getByRole("button", { name: "next", exact: true });
  await next.scrollIntoViewIfNeeded();
  const active = page.locator(".carousel__slide--visible article");
  const before = await active.textContent();
  await next.click();
  await expect(active).not.toHaveText(before);
  await page.getByRole("button", { name: "previous", exact: true }).click();
  await expect(active).toHaveText(before);
});

test("clinic map initializes with dimensions, marker and clinic popup", async ({ page, baseURL }) => {
  await preparePage(page, new URL("/clinics/crest-hill/", baseURL).href);
  const map = page.locator(".mapboxgl-map");
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator(".mapboxgl-canvas")).toBeVisible();
  const box = await map.boundingBox();
  expect(box.width).toBeGreaterThan(200);
  expect(box.height).toBeGreaterThan(200);
  await expect(map.locator(".mapboxgl-marker")).toBeVisible();
  await map.locator(".mapboxgl-marker").click();
  await expect(map.locator(".mapboxgl-popup")).toContainText(/Crest Hill/i);
});

test("unknown routes return 404 with a usable home link", async ({ page, baseURL }) => {
  const response = await page.goto(new URL("/__regression_missing_page__/", baseURL).href);
  expect(response.status()).toBe(404);
  await expect(page.locator("#main")).not.toHaveText("");
  await page.locator('a[href="/"]').first().click();
  await expect(page).toHaveURL(baseURL);
  await expect(page.locator("#main")).toBeVisible();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("core content and fallback navigation remain usable", async ({ page, baseURL }) => {
    const response = await page.goto(new URL("/conditions/", baseURL).href);
    expect(response.status()).toBe(200);
    await expect(page.locator("#main")).not.toHaveText("");
    const team = page.locator('noscript a[href="/providers/"]').first();
    await expect(team).toBeVisible();
    await team.click();
    await expect(page).toHaveURL(new URL("/providers/", baseURL).href);
    await expect(page.locator('#main a[href^="/providers/"]').first()).toBeVisible();
  });
});
