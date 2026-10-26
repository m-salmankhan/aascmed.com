import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  mapStrapiAnnouncement, mapStrapiBlog, mapStrapiClinic, mapStrapiCondition, mapStrapiHomePage,
  mapStrapiPage, mapStrapiProvider, mapStrapiReview, mapStrapiServiceUpdate, mapStrapiTrackingInfo,
} from "../../astro/src/server/content/mapping.ts";
import { getByIdentifier, getCollection, getSingle, POPULATE, serializeQuery, StrapiRequestError } from "../../astro/src/server/content/strapi.ts";

const fixture = async (name) => JSON.parse(await readFile(new URL(`../fixtures/strapi-v5/${name}.json`, import.meta.url), "utf8"));

test("Strapi v5 clinic mapper retains documentId and deeply nested opening and shot hours", async () => {
  const clinic = mapStrapiClinic(await fixture("clinic"));
  assert.equal(clinic.id, "clinic-crest-hill");
  assert.equal(clinic.documentId, "clinic-crest-hill");
  assert.equal(clinic.clinicName, "Crest Hill");
  assert.deepEqual(clinic.hours?.[0], {
    day: "Monday", open: true,
    openingHours: { startTime: "09:00", endTime: "17:00" },
    shotHours: { startTime: "10:00", endTime: "14:00" },
  });
  assert.equal(clinic.hours?.[1].open, false);
  assert.equal(clinic.location?.placeId, "place-123");
});

test("Strapi v5 condition mapper keeps FAQ blocks and normalized media descriptors", async () => {
  const condition = mapStrapiCondition(await fixture("condition"), "https://cms.example.test");
  assert.equal(condition.id, "condition-food-allergy");
  assert.equal(condition.thumbnail?.src, "https://cms.example.test/uploads/food-allergy.jpg");
  assert.equal(condition.thumbnail?.aspectRatio, 1.6);
  assert.deepEqual(condition.thumbnail?.sources, [
    { src: "https://cms.example.test/uploads/small_food.jpg", width: 500 },
    { src: "https://cms.example.test/uploads/food.webp", width: 800 },
  ]);
  assert.equal(condition.thumbnail?.formats?.[0].type, "image/webp");
  assert.equal(condition.content?.[1]?.__component, "condition.faq");
  assert.equal(condition.content?.[1]?.questions instanceof Array, true);
});

test("collection mappers normalize blog, provider, service update and review records", async () => {
  const blog = mapStrapiBlog({ documentId: "blog-1", title: "A post", heading: "Post", slug: "post", date: "2026-01-01", thumbnail: { url: "/uploads/post.jpg" }, content: [] }, "https://cms.example.test");
  const provider = mapStrapiProvider(await fixture("provider"), "https://cms.example.test");
  const update = mapStrapiServiceUpdate(await fixture("service-update"));
  const review = mapStrapiReview(await fixture("review"));
  assert.equal(blog.id, "blog-1");
  assert.equal(blog.thumbnail?.src, "https://cms.example.test/uploads/post.jpg");
  assert.equal(provider.name?.qualificationAbbr, "MD");
  assert.equal(provider.retirementNotice?.retired, false);
  assert.equal(provider.review?.reviewer, "Patient");
  assert.equal(provider.body?.[0]?.__component, "generic.rich-text");
  assert.equal(update.date, "2026-07-04T09:00:00.000Z");
  assert.equal(update.body?.[0]?.type, "paragraph");
  assert.equal(review.stars, 5);
  assert.equal(review.content?.[0]?.type, "paragraph");
});

test("all ten single types map to serializable shared records and nested media", async () => {
  const singleTypes = await fixture("single-types");
  const pageKinds = ["blog-archive", "conditions-archive", "clinics-archive", "contact", "providers-page", "service-update-page", "privacy-policy"];
  for (const kind of pageKinds) {
    const page = mapStrapiPage(singleTypes[kind]);
    assert.equal(page.documentId, kind);
    assert.equal(page.id, kind);
  }
  assert.equal(mapStrapiAnnouncement(singleTypes.announcement).message?.[0]?.type, "paragraph");
  const home = mapStrapiHomePage(singleTypes["home-page"], "https://cms.example.test");
  assert.equal(home.hero?.media?.[0]?.src, "https://cms.example.test/uploads/hero.jpg");
  assert.deepEqual(mapStrapiTrackingInfo(singleTypes["tracking-info"]), {
    googleAnalyticsId: "GA-1", googleTagManagerId: "GTM-1", pixelId: "PX-1",
  });
});

test("per-type FAQ population explicitly fetches nested question components", () => {
  const query = serializeQuery({ populate: POPULATE.condition });
  assert.ok(query.includes("populate%5Bcontent%5D%5Bon%5D%5Bgeneric.faq%5D%5Bpopulate%5D%5Bquestions%5D%5Bpopulate%5D=*"));
});

test("collection loader paginates past 100 with bounded page size and explicit publication status", async () => {
  process.env.ASTRO_STRAPI_API_URL = "https://cms.example.test";
  const requested = [];
  const fetcher = async (url) => {
    const parsed = new URL(url);
    requested.push(parsed);
    const page = Number(parsed.searchParams.get("pagination[page]"));
    const items = Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({ documentId: `doc-${(page - 1) * 100 + index}` }));
    return Response.json({ data: items, meta: { pagination: { pageCount: 2, total: 101 } } });
  };
  const records = await getCollection("blog", { mode: "published", fetcher });
  assert.equal(records.length, 101);
  assert.equal(requested.length, 2);
  assert.deepEqual(requested.map((url) => url.searchParams.get("pagination[pageSize]")), ["100", "100"]);
  assert.ok(requested.every((url) => url.searchParams.get("status") === "published"));
  assert.ok(requested.every((url) => url.searchParams.has("populate[thumbnail]")));
});

test("collection pagination stops at the 1,000 record safety limit", async () => {
  process.env.ASTRO_STRAPI_API_URL = "https://cms.example.test";
  const pages = [];
  const previousWarn = console.warn;
  console.warn = () => {};
  try {
    const records = await getCollection("review", {
      mode: "published",
      fetcher: async (url) => {
        const page = Number(new URL(url).searchParams.get("pagination[page]"));
        pages.push(page);
        return Response.json({
          data: Array.from({ length: 100 }, (_, index) => ({ documentId: `review-${page}-${index}` })),
          meta: { pagination: { pageCount: 50 } },
        });
      },
    });
    assert.equal(records.length, 1000);
    assert.equal(pages.length, 10);
    assert.equal(pages.at(-1), 10);
  } finally { console.warn = previousWarn; }
});

test("individual draft route lookup filters by slug and returns null when absent", async () => {
  process.env.ASTRO_DRAFT_STRAPI_API_URL = "https://draft-cms.example.test";
  const parsed = [];
  const fetcher = async (url) => {
    const request = new URL(url);
    parsed.push(request);
    return Response.json({ data: [] });
  };
  assert.equal(await getByIdentifier("blog", "slug", "new-draft", { mode: "draft", fetcher }), null);
  assert.equal(parsed[0].searchParams.get("status"), "draft");
  assert.equal(parsed[0].searchParams.get("filters[slug][$eq]"), "new-draft");
  assert.equal(parsed[0].searchParams.get("pagination[pageSize]"), "1");
});

test("draft requests use the draft status and keep the bearer token off published requests", async () => {
  process.env.ASTRO_STRAPI_API_URL = "https://cms.example.test";
  process.env.ASTRO_DRAFT_STRAPI_API_URL = "https://draft-cms.example.test";
  process.env.ASTRO_STRAPI_TOKEN = "fixture-secret-token";
  const seen = [];
  const fetcher = async (url, init) => {
    const parsed = new URL(url);
    seen.push({ url: parsed, authorization: new Headers(init.headers).get("Authorization") });
    if (parsed.pathname.endsWith("/blog")) return Response.json({ data: [await fixture("draft-blog")] });
    return Response.json({ data: { documentId: "draft-home" } });
  };
  await getSingle("home-page", { mode: "published", fetcher });
  const drafts = await getCollection("blog", { mode: "draft", fetcher });
  assert.equal(seen[0].url.searchParams.get("status"), "published");
  assert.equal(seen[0].authorization, null);
  assert.equal(seen[0].url.searchParams.has("populate[hero][populate][media]"), true);
  assert.equal(seen[1].url.searchParams.get("status"), "draft");
  assert.equal(seen[1].authorization, "Bearer fixture-secret-token");
  assert.equal(seen[1].url.searchParams.has("populate[thumbnail]"), true);
  assert.equal(drafts[0].documentId, "blog-unpublished-preview");
  assert.equal(drafts[0].heading, "An edited heading awaiting publication");
  assert.equal(drafts[0].publishedAt, null);
  delete process.env.ASTRO_STRAPI_TOKEN;
});

test("missing single type is distinct from upstream failure and errors do not expose request secrets", async () => {
  process.env.ASTRO_DRAFT_STRAPI_API_URL = "https://draft-cms.example.test";
  process.env.ASTRO_STRAPI_TOKEN = "fixture-secret-token";
  const missing = await getSingle("privacy-policy", { mode: "draft", fetcher: async () => new Response(null, { status: 404 }) });
  assert.equal(missing, null);
  await assert.rejects(
    getSingle("privacy-policy", { mode: "draft", fetcher: async () => new Response("private body", { status: 503 }) }),
    (error) => error instanceof StrapiRequestError && error.kind === "upstream" && !error.message.includes("fixture-secret-token") && !error.message.includes("private body"),
  );
  delete process.env.ASTRO_STRAPI_TOKEN;
});
