import assert from "node:assert/strict";
import test from "node:test";

import { toBlogArchiveItems, toConditionArchiveItems, toProviderArchiveItems } from "../../astro/src/server/content/archive-items.ts";
import { mapStrapiProvider } from "../../astro/src/server/content/mapping.ts";
import { validateContentRecord } from "../../src/shared/content/validation.ts";

test("blog archive items keep descending date order, formatted dates, excerpts, and media alt text", () => {
  const items = toBlogArchiveItems([
    { id: "older", title: "Older", slug: "older", date: "2026-01-01", description: "Old" },
    { id: "newer", title: "Newest", slug: "newest", date: "2026-10-26", description: "New", thumbnail: { src: "/new.jpg", alt: "" } },
    { id: "bad-path", title: "Not routable", slug: "bad%2fslug", date: "2026-12-01" },
  ], { "blog:newest": { src: "/media/blog-newest.webp", alt: "optimized" } });

  assert.deepEqual(items.map(({ slug }) => slug), ["/blog/newest/", "/blog/older/"]);
  assert.equal(items[0].date, "26th October 2026");
  assert.equal(items[0].description, "New");
  assert.equal(items[0].thumbnail.src, "/media/blog-newest.webp");
  assert.equal(items[0].thumbnail.alt, "Newest");
});

test("condition archive items prefer the display heading and omit invalid slugs", () => {
  const items = toConditionArchiveItems([
    { id: "allergy", title: "Allergy", heading: "Food Allergy", slug: "food-allergy" },
    { id: "invalid", title: "Bad", slug: "../bad" },
  ], { "condition:food-allergy": { src: "/media/condition-food-allergy.webp", alt: "optimized" } });
  assert.deepEqual(items.map(({ slug, title }) => ({ slug, title })), [
    { slug: "/conditions/food-allergy/", title: "Food Allergy" },
  ]);
  assert.equal(items[0].thumbnail.src, "/media/condition-food-allergy.webp");
});

test("provider archive items keep retirement and body excerpts, including name-only CMS titles", () => {
  const provider = mapStrapiProvider({
    documentId: "provider-retired", slug: "retired-doctor",
    name: { fullName: "Alex Example", honorific: "Dr." },
    retirementNotice: { retired: true, text: [] },
    body: [{ __component: "generic.rich-text", text: [{ type: "paragraph", children: [{ type: "text", text: "A biography excerpt." }] }] }],
  });
  assert.equal(provider.title, "Alex Example");
  assert.deepEqual(validateContentRecord(provider, "provider", "published"), []);
  assert.deepEqual(toProviderArchiveItems([provider]).map(({ slug, excerpt, retired }) => ({ slug, excerpt, retired })), [
    { slug: "/providers/retired-doctor/", excerpt: "A biography excerpt.", retired: true },
  ]);
});
