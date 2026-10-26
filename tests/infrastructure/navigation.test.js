const { test } = require("node:test");
const assert = require("node:assert/strict");
const ts = require("typescript");

require.extensions[".tsx"] = (module, filename) => {
  const source = require("node:fs").readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { CurrentPathProvider } = require("../../src/shared/navigation/current-path.tsx");
const { SiteLink } = require("../../src/shared/navigation/link.tsx");
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "./src/adapters/gatsby/shared-data" && /gatsby-(browser|ssr)\.tsx$/.test(parent?.filename || "")) {
    return { __esModule: true, default: ({ children }) => children };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const gatsbySsr = require("../../gatsby-ssr.tsx");
const gatsbyBrowser = require("../../gatsby-browser.tsx");
Module._load = originalLoad;

test("SSR current-path context renders the active class and aria-current before hydration", () => {
  const html = renderToStaticMarkup(
    React.createElement(CurrentPathProvider, { path: "/blog" },
      React.createElement(React.Fragment, null,
        React.createElement(SiteLink, { href: "/blog/", activeClassName: "active" }, "Blog"),
        React.createElement(SiteLink, { href: "/conditions/", activeClassName: "active" }, "Conditions"),
      ),
    ),
  );

  assert.match(html, /<a href="\/blog\/" class="active" aria-current="page">Blog<\/a>/);
  assert.match(html, /<a href="\/conditions\/">Conditions<\/a>/);
});

test("partial, fragment and external links retain their distinct current-page semantics", () => {
  const html = renderToStaticMarkup(
    React.createElement(CurrentPathProvider, { path: "/blog/a-post/" },
      React.createElement(React.Fragment, null,
        React.createElement(SiteLink, { href: "/blog/", activeClassName: "active", partiallyActive: true }, "Blog"),
        React.createElement(SiteLink, { href: "#contents", activeClassName: "active" }, "Contents"),
        React.createElement(SiteLink, { href: "https://example.test/", activeClassName: "active" }, "External"),
      ),
    ),
  );

  assert.match(html, /<a href="\/blog\/" class="active">Blog<\/a>/);
  assert.match(html, /<a href="#contents">Contents<\/a>/);
  assert.match(html, /<a href="https:\/\/example\.test\/">External<\/a>/);
});

test("Gatsby browser and SSR wrappers inject identical active-link markup", () => {
  const element = React.createElement(SiteLink, { href: "/blog/", activeClassName: "active" }, "Blog");
  const renderWrapped = wrapper => renderToStaticMarkup(wrapper({
    element,
    props: { location: { pathname: "/blog" } },
  }));

  const ssrMarkup = renderWrapped(gatsbySsr.wrapPageElement);
  const browserMarkup = renderWrapped(gatsbyBrowser.wrapPageElement);
  assert.equal(ssrMarkup, browserMarkup);
  assert.match(ssrMarkup, /class="active" aria-current="page"/);
});
