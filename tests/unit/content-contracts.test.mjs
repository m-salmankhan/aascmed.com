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
} from "../../src/shared/content/urls.ts";
import {
  mapGatsbyBlog,
  mapGatsbyClinic,
  mapGatsbyCondition,
  mapGatsbyMedia,
  mapGatsbyProvider,
  mapGatsbyServiceUpdate,
  isJsonValue,
} from "../../src/shared/content/gatsby-adapter.ts";
import { validateContentRecord } from "../../src/shared/content/validation.ts";

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
  const missingTitles = [
    ["blog", mapGatsbyBlog({ id: "1", slug: "post" })],
    ["condition", mapGatsbyCondition({ id: "2", slug: "condition" })],
    ["provider", mapGatsbyProvider({ id: "3", slug: "provider" })],
    ["clinic", mapGatsbyClinic({ id: "4", slug: "clinic" })],
    ["serviceUpdate", mapGatsbyServiceUpdate({ id: "5", slug: "update", date: "2025-02-14" })],
  ];
  for (const [family, record] of missingTitles) {
    assert.deepEqual(validateContentRecord(record, family, "published"), ["title is required"]);
  }
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

test("Gatsby adapters keep blocks and media serializable and omit absent optional content", () => {
  const block = { type: "paragraph", children: [{ type: "text", text: "Draft text" }] };
  const mapped = mapGatsbyBlog({
    id: "blog-1",
    slug: "sample-post",
    title: "Sample post",
    internal: { content: JSON.stringify({ content: [block], body: "not an array" }) },
    thumbnail: {
      altText: "Cover",
      mime: "image/jpeg",
      localFile: { childImageSharp: { gatsbyImageData: { images: { fallback: { src: "/cover.jpg", width: 640, height: 360 } } } } },
    },
  });
  assert.deepEqual(mapped.content, [block]);
  assert.equal("body" in mapped, false);
  assert.deepEqual(mapped.thumbnail, { src: "/cover.jpg", alt: "Cover", width: 640, height: 360, mimeType: "image/jpeg" });
  assert.deepEqual(mapGatsbyMedia({ url: "/source.jpg" }), { src: "/source.jpg", alt: "" });
  assert.equal("internal" in mapped, false);
  assert.equal(isJsonValue(mapped), true);

  const retirementText = [{ type: "paragraph", children: [{ type: "text", text: "Retired" }] }];
  const provider = mapGatsbyProvider({
    id: "provider-1",
    name: { fullName: "Dr Example", honorific: null },
    retirementNotice: { retired: true },
    review: { text: null, reviewer: "Patient", date: null },
    internal: { content: JSON.stringify({ retirementNotice: { text: retirementText } }) },
  });
  assert.equal(provider.title, "Dr Example");
  assert.equal(provider.body, undefined);
  assert.deepEqual(provider.retirementNotice, { retired: true, text: retirementText });
  assert.deepEqual(provider.name, { fullName: "Dr Example" });
  assert.deepEqual(provider.review, { reviewer: "Patient" });
  const sparseProvider = mapGatsbyProvider({ id: "provider-2", name: { fullName: null }, retirementNotice: null, review: null });
  assert.equal(sparseProvider.title, "");
  assert.deepEqual(validateContentRecord(sparseProvider, "provider", "published"), [
    "title is required",
    "a valid URL for this content record is required",
  ]);
  assert.equal(isJsonValue(sparseProvider), true);
  const clinic = mapGatsbyClinic({ id: "clinic-1", clinic_name: "Crest Hill", hours: [null, { day: "Monday", opening_hours: { start_time: "09:00" } }] });
  assert.equal(clinic.clinicName, "Crest Hill");
  assert.equal(clinic.hours?.length, 1);
  assert.deepEqual(clinic.hours?.[0]?.openingHours, { startTime: "09:00" });
  assert.equal(mapGatsbyClinic({ id: "clinic-2", hours: null }).hours, undefined);
  assert.equal(isJsonValue(provider), true);
  assert.equal(isJsonValue(clinic), true);
});

test("shared model declarations stay free of framework nodes, GraphQL query types, and credentials", async () => {
  const modelText = await readFile(new URL("../../src/shared/content/models.ts", import.meta.url), "utf8");
  const declarations = modelText.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
  assert.doesNotMatch(declarations, /Queries\.|GatsbyImageData|localFile|ReactNode|\btoken\b|\bpassword\b/i);
});
