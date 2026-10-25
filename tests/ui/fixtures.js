const { test: base, expect } = require("@playwright/test");
const { installSafety } = require("./helpers");

const test = base.extend({
  safety: [async ({ context }, use) => {
    const violations = await installSafety(context);
    await use();
    expect(violations, "Unhandled write requests were blocked; explicitly mock expected form submissions").toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect };
