const { test, expect } = require("@playwright/test");
const { preparePage, pageContract, semanticImages, installSafety } = require("../ui/helpers");
const fs = require("node:fs");
const ts = require("typescript");
const path = require("node:path");

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

test("standalone links without an active class still announce the current page", async ({ page }) => {
  await page.route("http://navigation.fixture.test/**", route =>
    route.fulfill({ contentType: "text/html", body: '<main id="root"></main>' }));
  await page.goto("http://navigation.fixture.test/blog/");
  await page.addScriptTag({ path: path.resolve("node_modules/react/umd/react.development.js") });
  await page.addScriptTag({ path: path.resolve("node_modules/react-dom/umd/react-dom.development.js") });

  const compileTsx = filename => ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const modules = {
    link: compileTsx(path.resolve("src/shared/navigation/link.tsx")),
    currentPath: compileTsx(path.resolve("src/shared/navigation/current-path.tsx")),
  };
  const script = `(() => {
    const cache = {};
    function load(name) {
      if (cache[name]) return cache[name].exports;
      const module = { exports: {} };
      cache[name] = module;
      const localRequire = request => request === "react" ? window.React :
        request === "./current-path" ? load("currentPath") : (() => { throw new Error(request); })();
      new Function("require", "module", "exports", ${JSON.stringify(modules.link)})(localRequire, module, module.exports);
      return module.exports;
    }
    const currentPathModule = { exports: {} };
    new Function("require", "module", "exports", ${JSON.stringify(modules.currentPath)})(
      request => request === "react" ? window.React : (() => { throw new Error(request); })(),
      currentPathModule, currentPathModule.exports);
    cache.currentPath = currentPathModule;
    const { SiteLink } = load("link");
    window.ReactDOM.createRoot(document.getElementById("root")).render(
      window.React.createElement(SiteLink, { href: "/blog/" }, "Footer Blog"));
  })();`;
  await page.addScriptTag({ content: script });

  const blog = page.getByRole("link", { name: "Footer Blog" });
  await expect(blog).toHaveAttribute("aria-current", "page");
  await expect(blog).not.toHaveAttribute("class");
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

test("JavaScript-enabled contracts ignore noscript fallback markup in content and link labels", async ({ page }) => {
  const body = fixture.replace('<a href="/contact/">Contact</a>',
    '<a href="/clinics/test/">Clinic<noscript><img src="/fallback-one.png" alt="Fallback one"></noscript></a>');
  await page.route(url, route => route.fulfill({ contentType: "text/html", body }));
  await preparePage(page, url);
  const original = await pageContract(page);
  await page.locator("#main noscript").evaluate(element => {
    element.textContent = '<picture><img src="/fallback-two.png" alt="Fallback two"></picture>';
  });
  const updated = await pageContract(page);
  expect(updated.content).toBe(original.content);
  expect(updated.links).toEqual(original.links);
  expect(original.content).not.toContain("Fallback");
  expect(original.links.find(link => link.href === "/clinics/test/").text).toBe("Clinic");
});

test("reference differences are advisory and retain contract and image evidence", async ({ page, context }, testInfo) => {
  const { comparePages } = require("../ui/comparison");
  const reference = await context.newPage();
  await preparePage(reference, url);
  await preparePage(page, url);
  await page.evaluate(() => {
    document.body.style.background = "red";
    document.querySelector("#main p").textContent = "Changed content";
    document.querySelector('img[alt="Clinic"]').alt = "Updated clinic";
  });
  await comparePages(reference, page, testInfo);
  const differences = testInfo.annotations.filter(annotation => annotation.type === "reference-difference");
  expect(differences.map(annotation => annotation.description)).toEqual(
    expect.arrayContaining(["Content/metadata/links/forms", "Image semantics", expect.stringContaining("Changed pixels")]));
  expect(testInfo.attachments.map(attachment => attachment.name)).toEqual(
    expect.arrayContaining(["reference-contract", "candidate-contract", "reference", "candidate", "difference"]));
});

test("layout dimension differences are advisory and retain both screenshots", async ({ page, context }, testInfo) => {
  const { comparePages } = require("../ui/comparison");
  const reference = await context.newPage();
  await preparePage(reference, url);
  await preparePage(page, url);
  await page.evaluate(() => {
    document.body.style.minHeight = `${Math.max(innerHeight, document.documentElement.scrollHeight) + 400}px`;
  });
  await comparePages(reference, page, testInfo);
  expect(testInfo.annotations).toContainEqual({
    type: "reference-difference", description: expect.stringContaining("Screenshot dimensions"),
  });
  expect(testInfo.attachments.map(attachment => attachment.name)).toEqual(
    expect.arrayContaining(["reference", "candidate"]));
});

test("unchanged pages have no reference-difference annotations", async ({ page, context }, testInfo) => {
  const { comparePages } = require("../ui/comparison");
  const reference = await context.newPage();
  await preparePage(reference, url);
  await preparePage(page, url);
  await comparePages(reference, page, testInfo);
  expect(testInfo.annotations.filter(annotation => annotation.type === "reference-difference")).toEqual([]);
});

test("comparison errors are not converted into advisory differences", async ({ page, context }, testInfo) => {
  const { comparePages } = require("../ui/comparison");
  const reference = await context.newPage();
  await preparePage(reference, url);
  await preparePage(page, url);
  await page.locator('script[type="application/ld+json"]').evaluate(script => { script.textContent = "invalid JSON"; });
  await expect(comparePages(reference, page, testInfo)).rejects.toThrow(/JSON/);
  expect(testInfo.annotations.filter(annotation => annotation.type === "reference-difference")).toEqual([]);
});
