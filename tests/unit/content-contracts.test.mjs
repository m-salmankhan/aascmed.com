import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  blogPath,
  clinicPath,
  conditionPath,
  providerPath,
  serviceUpdatePath,
  sortByDateDescending,
  sortByOrder,
} from "../../src/content/urls.ts";
import { validateContentRecord } from "../../src/content/validation.ts";

test("detail URL helpers reproduce representative captured routes", async () => {
  const capturedRoutes = JSON.parse(await readFile(new URL("../ui/routes.json", import.meta.url), "utf8"));
  const generated = [
    blogPath("what-diseases-start-with-hives"),
    conditionPath("food-allergy"),
    providerPath("maaz-mohiuddin"),
    serviceUpdatePath({ slug: "dr-lantner-retirement", date: "2025-02-14" }),
    clinicPath({ slug: null, clinicName: "Crest Hill" }),
  ];

  for (const path of generated) assert.ok(capturedRoutes.includes(path), `${path} should remain in the route baseline`);
  assert.equal(blogPath("/already-trimmed/"), "/blog/already-trimmed/");
  assert.equal(blogPath("draft#section"), null);
  assert.equal(blogPath("draft?mode=preview"), null);
  assert.equal(blogPath("../secret"), null);
  assert.equal(blogPath(".\n./secret"), null);
  assert.equal(blogPath("draft\tpreview"), null);
  assert.equal(blogPath("draft\rpreview"), null);
  assert.equal(blogPath("office//closure"), null);
  assert.equal(blogPath("office/closure"), "/blog/office/closure/");
  assert.equal(serviceUpdatePath({ slug: "office/closure", date: "2025-02-14" }), "/service-updates/2025/02/office/closure/");
  assert.equal(serviceUpdatePath({ slug: "historic-update", date: null }), null);
  assert.equal(serviceUpdatePath({ slug: "bad-date", date: "2025-02-30" }), null);
  assert.equal(serviceUpdatePath({ slug: null, date: null }), null);
});

test("published validation requires routable records while drafts tolerate incomplete fields", () => {
  const incomplete = { id: "", slug: null, title: "" };
  assert.deepEqual(validateContentRecord(incomplete, "blog", "draft"), []);
  assert.deepEqual(validateContentRecord(incomplete, "blog", "published"), [
    "id is required",
    "title is required",
    "a valid URL for this content record is required",
  ]);
  assert.deepEqual(validateContentRecord(
    { id: "clinic-1", title: "Crest Hill", slug: null, clinicName: "Crest Hill" }, "clinic", "published",
  ), []);
  assert.deepEqual(validateContentRecord(
    { id: "update-1", title: "Update", slug: "update", date: "bad date" }, "serviceUpdate", "published",
  ), ["a valid URL for this content record is required"]);
  assert.deepEqual(validateContentRecord(
    { id: "update-1", title: "Update", slug: "update", date: null }, "serviceUpdate", "published",
  ), ["a valid URL for this content record is required"]);
  assert.deepEqual(validateContentRecord(
    { id: "post-1", title: "Post", slug: "draft#section" }, "blog", "published",
  ), ["a valid URL for this content record is required"]);
});

test("ordering helpers preserve query order for ties and place missing or invalid dates last", () => {
  assert.deepEqual(sortByOrder([
    { id: "unranked" }, { id: "second", order: 2 }, { id: "first-a", order: 1 }, { id: "first-b", order: 1 },
  ]).map(({ id }) => id), ["first-a", "first-b", "second", "unranked"]);
  assert.deepEqual(sortByDateDescending([
    { id: "missing", date: null }, { id: "old", date: "2022-08-01" }, { id: "bad", date: "not-a-date" },
    { id: "new", date: "2025-07-01" }, { id: "same-a", date: "2025-07-01" }, { id: "rollover", date: "2025-02-30" },
  ]).map(({ id }) => id), ["new", "same-a", "old", "missing", "bad", "rollover"]);
});

test("blog hero picture and image retain a fixed crop box", async () => {
  const source = await readFile(new URL("../../src/views/blog-post.tsx", import.meta.url), "utf8");
  assert.match(source, /picture \{\s*width: 100%;\s*height: 20em;/);
  assert.match(source, /img \{\s*width: 100%;\s*height: 20em;/);
  assert.match(source, /picture img \{\s*height: 100%;/);
});
test("content models stay free of framework nodes, GraphQL query types, and credentials", async () => {
  const modelText = await readFile(new URL("../../src/content/models.ts", import.meta.url), "utf8");
  const declarations = modelText.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  assert.doesNotMatch(declarations, /GraphQL|localFile|ReactNode|\btoken\b|\bpassword\b/i);
});

test('native dates preserve ordinal, review and service-update formats in UTC', async () => {
  const { formatOrdinalDate, formatReviewDate, formatServiceUpdateDate, ordinal } = await import('../../src/utils/dates.ts');
  assert.deepEqual([1,2,3,4,11,12,13,21,22,23,31].map(ordinal), ['1st','2nd','3rd','4th','11th','12th','13th','21st','22nd','23rd','31st']);
  assert.equal(formatOrdinalDate('2026-11-01T00:30:00Z'), '1st November 2026');
  assert.equal(formatReviewDate('2026-11-01T00:30:00Z'), 'November 1, 2026');
  assert.equal(formatOrdinalDate('2026-11-01T23:30:00-06:00'), '2nd November 2026');
  assert.equal(formatServiceUpdateDate('2026-11-01T23:30:00-06:00'), '1st November 2026');
  assert.equal(formatOrdinalDate('2024-02-29'), '29th February 2024');
  for (const value of ['', null, undefined, 'invalid', '2026-02-30', '2026-13-01', '2026-11-01junk']) {
    assert.equal(formatOrdinalDate(value), '');
    assert.equal(formatReviewDate(value), '');
    assert.equal(formatServiceUpdateDate(value), '');
  }
});
