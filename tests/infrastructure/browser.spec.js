const { test, expect } = require("@playwright/test");
const { preparePage, pageContract, semanticImages, installSafety } = require("../ui/helpers");

const url = "https://fixture.test/";
const fixture = `<!doctype html><html lang="en-US"><head>
  <title>Fixture</title><meta name="description" content="Fixture description">
  <link rel="canonical" href="https://www.aascmed.com/">
  <meta property="og:title" content="Fixture">
  <script type="application/ld+json">{"@type":"MedicalClinic","name":"Clinic"}</script>
  </head><body><header><nav><a href="/providers/">Our Team</a></nav></header>
  <main id="main"><h1>Content</h1><p>Stable content</p>
  <img alt="Clinic" loading="lazy" draggable="false" width="10" height="10"
    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3C/svg%3E">
  <img aria-hidden="true" alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">
  <a href="/contact/">Contact</a><form><input type="hidden" name="clinic" value="Clinic"></form>
  </main><footer><a href="/privacy/">Privacy</a></footer>
  <a href="https://www.zocdoc.com/practice/test"><button>Dismiss</button></a><script>
    setTimeout(() => {
      document.querySelector("button").onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        event.target.remove();
      };
      const script = document.createElement("script");
      script.src = "https://offsiteschedule.zocdoc.com/plugin/embed";
      document.head.append(script);
    }, 250);
  </script></body></html>`;

test.beforeEach(async ({ context }) => {
  await context.route(url, route => route.fulfill({ contentType: "text/html", body: fixture }));
  await context.route("https://offsiteschedule.zocdoc.com/plugin/embed",
    route => route.fulfill({ contentType: "application/javascript", body: "" }));
  await context.route("https://www.zocdoc.com/practice/test",
    route => route.fulfill({ contentType: "text/html", body: "<h1>Unwanted premature navigation</h1>" }));
});

test("readiness works without Gatsby markers and waits for interactive dismissal", async ({ page }) => {
  await preparePage(page, url);
  await expect(page.getByRole("button", { name: "Dismiss", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByName("onInitialClientRender").length)).toBe(0);
  expect(await semanticImages(page)).toEqual([{ alt: "Clinic", loading: "lazy", draggable: false }]);
});

test("contract detects text, metadata, heading, link and structured-data mutations", async ({ page }) => {
  await preparePage(page, url);
  const original = await pageContract(page);
  expect(original.metadata.title).toBe("Fixture");
  for (const [selector, attribute, value] of [
    ["#main p", null, "Changed content"],
    ['meta[name="description"]', "content", "Changed description"],
    ["h1", null, "Changed heading"],
    ['#main a', "href", "/wrong/"],
    ['script[type="application/ld+json"]', null, '{"@type":"Wrong"}'],
    ['input[name="clinic"]', "value", "Wrong clinic"],
  ]) {
    await page.evaluate(({ selector, attribute, value }) => {
      const element = document.querySelector(selector);
      if (attribute) element.setAttribute(attribute, value);
      else element.textContent = value;
    }, { selector, attribute, value });
    expect(await pageContract(page)).not.toEqual(original);
    await preparePage(page, url);
  }
});

test("safety guard blocks all unhandled mutations including popup pages", async ({ context, page }) => {
  const violations = await installSafety(context);
  await page.goto(url);
  await page.evaluate(async () => {
    await fetch("/unexpected-contact/", { method: "POST", body: "{}" }).catch(() => {});
  });
  const popup = await context.newPage();
  await popup.goto(url);
  await popup.evaluate(async () => {
    await fetch("/delete/", { method: "DELETE" }).catch(() => {});
  });
  expect(violations).toEqual(["POST https://fixture.test/unexpected-contact/", "DELETE https://fixture.test/delete/"]);
});

test("semantic image checks detect alt and loading regressions on ordinary HTML images", async ({ page }) => {
  await preparePage(page, url);
  const original = await semanticImages(page);
  await page.locator('img[alt="Clinic"]').evaluate(image => {
    image.removeAttribute("alt");
    image.loading = "eager";
  });
  expect(await semanticImages(page)).not.toEqual(original);
});

test("invalid structured data fails rather than disappearing from the contract", async ({ page }) => {
  await preparePage(page, url);
  await page.locator('script[type="application/ld+json"]').evaluate(script => { script.textContent = "invalid JSON"; });
  await expect(pageContract(page)).rejects.toThrow(/JSON/);
});
