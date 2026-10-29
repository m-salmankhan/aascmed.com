// Checks Strapi request, mapping, pagination and publication contracts using isolated fixtures.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createServer } from "node:http";
import { clinicPath } from "../../src/shared/content/urls.ts";
import {
  mapStrapiAnnouncement,
  mapStrapiBlog,
  mapStrapiClinic,
  mapStrapiCondition,
  mapStrapiHomePage,
  mapStrapiPage,
  mapStrapiProvider,
  mapStrapiReview,
  mapStrapiServiceUpdate,
  mapStrapiTrackingInfo,
} from "../../astro/src/server/content/mapping.ts";
import {
  getByIdentifier,
  getCollection,
  getSingle,
  POPULATE,
  StrapiRequestError,
} from "../../astro/src/server/content/strapi.ts";
import { getPublishedCollections } from "../../astro/src/server/content/loaders.ts";
/** Load a representative Strapi fixture by its filename stem.
 * @param {string} name Fixture filename without the JSON extension.
 * @returns {Promise<object>} Parsed fixture data.
 */
const fixture = async (name) => {
  return JSON.parse(
    await readFile(new URL(`../fixtures/strapi-v5/${name}.json`, import.meta.url), "utf8"),
  );
};
test("Strapi v5 clinic mapper retains documentId and deeply nested opening and shot hours", async () => {
  const clinic = mapStrapiClinic(await fixture("clinic"));
  assert.equal(clinic.id, "clinic-crest-hill");
  assert.equal(clinic.documentId, "clinic-crest-hill");
  assert.equal(clinic.clinicName, "Crest Hill");
  assert.deepEqual(clinic.hours?.[0], {
    day: "Monday",
    open: true,
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
    { src: "https://cms.example.test/uploads/food-allergy.jpg", width: 800 },
  ]);
  assert.equal(condition.thumbnail?.formats?.[0].type, "image/webp");
  assert.equal(condition.content?.[1]?.__component, "generic.faq");
  assert.equal(condition.content?.[1]?.questions instanceof Array, true);
});
test("collection mappers normalize blog, provider, service update and review records", async () => {
  const blog = mapStrapiBlog(
    {
      documentId: "blog-1",
      title: "A post",
      heading: "Post",
      slug: "post",
      date: "2026-01-01",
      thumbnail: { url: "/uploads/post.jpg" },
      content: [],
    },
    "https://cms.example.test",
  );
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
  const incompleteDraft = mapStrapiBlog(await fixture("draft-blog"));
  assert.equal(Object.hasOwn(incompleteDraft, "thumbnail"), false);
  assert.deepEqual(incompleteDraft.content, []);
});
test("all ten single types map to serializable shared records and nested media", async () => {
  const singleTypes = await fixture("single-types");
  const pageKinds = [
    "blog-archive",
    "conditions-archive",
    "clinics-archive",
    "contact",
    "providers-page",
    "service-update-page",
    "privacy-policy",
  ];
  for (const kind of pageKinds) {
    const page = mapStrapiPage(singleTypes[kind]);
    assert.equal(page.documentId, kind);
    assert.equal(page.id, kind);
  }
  assert.equal(mapStrapiAnnouncement(singleTypes.announcement).message?.[0]?.type, "paragraph");
  const home = mapStrapiHomePage(singleTypes["home-page"], "https://cms.example.test");
  assert.equal(home.hero?.media?.[0]?.src, "https://cms.example.test/uploads/hero.jpg");
  const repeated = mapStrapiHomePage(
    {
      documentId: "home",
      genericBelowHero: [
        { heading: "More", media: [{ url: "/uploads/card.jpg", mime: "image/jpeg" }] },
      ],
    },
    "https://cms.example.test",
  );
  assert.equal(
    repeated.genericBelowHero[0].media[0].src,
    "https://cms.example.test/uploads/card.jpg",
  );
  assert.deepEqual(mapStrapiTrackingInfo(singleTypes["tracking-info"]), {
    googleAnalyticsId: "GA-1",
    googleTagManagerId: "GTM-1",
    pixelId: "PX-1",
  });
});
/** Run real SDK calls through a temporary fetch mock and restore the global transport.
 * @param {(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>} fetcher Mock response behavior.
 * @param {() => Promise<unknown>} operation SDK-backed loader operation.
 * @returns The loader result after all mocked fetch calls complete.
 */
async function withFetch(fetcher, operation) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetcher;
  try {
    return await operation();
  } finally {
    globalThis.fetch = originalFetch;
  }
}
test("official SDK serializes nested population and fetches every collection page", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  const requests = [];
  const records = await withFetch(async (request) => {
    requests.push(request);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("pagination[page]"));
    return Response.json({
      data: Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({
        documentId: `doc-${(page - 1) * 100 + index}`,
      })),
      meta: { pagination: { pageCount: 2, total: 101 } },
    });
  }, () => getCollection("blog", { mode: "published" }));
  assert.equal(records.length, 101);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    const url = new URL(request.url);
    assert.equal(url.pathname, "/api/blogs");
    assert.equal(url.searchParams.get("status"), "published");
    assert.equal(url.searchParams.get("pagination[pageSize]"), "100");
    assert.equal(url.searchParams.get("populate[thumbnail]"), "true");
    assert.equal(
      url.searchParams.get("populate[content][on][clinics.map][populate]"),
      "*",
    );
    assert.equal(request.headers.get("Cache-Control"), "no-store");
  }
  assert.deepEqual(
    requests.map((request) => new URL(request.url).searchParams.get("pagination[page]")),
    ["1", "2"],
  );
});
test("all collection managers use the configured Strapi REST paths", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test/custom/api";
  const paths = [];
  await withFetch(async (request) => {
    paths.push(new URL(request.url).pathname);
    return Response.json({ data: [], meta: { pagination: { pageCount: 1 } } });
  }, async () => {
    for (const kind of ["blog", "clinic", "condition", "provider", "service-update", "review"]) {
      await getCollection(kind, { mode: "published" });
    }
  });
  assert.deepEqual(paths, [
    "/custom/api/blogs",
    "/custom/api/clinics",
    "/custom/api/conditions",
    "/custom/api/providers",
    "/custom/api/service-updates",
    "/custom/api/reviews",
  ]);
});
test("published collection reads are fresh and run independently through the SDK", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  let requests = 0;
  let active = 0;
  let maxActive = 0;
  await withFetch(async (request) => {
    requests++;
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    assert.equal(new URL(request.url).searchParams.get("status"), "published");
    return Response.json({ data: [], meta: { pagination: { pageCount: 1, total: 0 } } });
  }, async () => {
    await getPublishedCollections();
    assert.equal(requests, 6);
    assert.ok(maxActive > 1);
    requests = 0;
    await getPublishedCollections();
    await getPublishedCollections();
    assert.equal(requests, 12);
  });
});
test("collection pagination rejects responses beyond the safety cap", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  let requests = 0;
  await withFetch(async () => {
    requests++;
    return Response.json({
      data: [{ documentId: "review-1" }],
      meta: { pagination: { pageCount: 10001 } },
    });
  }, async () => {
    await assert.rejects(
      getCollection("review", { mode: "published" }),
      (error) =>
        error instanceof StrapiRequestError &&
        error.kind === "upstream" &&
        error.message.includes("1000000 record"),
    );
  });
  assert.equal(requests, 1);
});
test("draft mode requires deployment configuration and requests carry explicit status", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://draft-cms.example.test";
  delete process.env.ASTRO_CONTENT_MODE;
  await assert.rejects(
    getCollection("blog", { mode: "draft" }),
    (error) => error instanceof StrapiRequestError && error.kind === "configuration",
  );
  process.env.ASTRO_CONTENT_MODE = "draft";
  process.env.STRAPI_TOKEN = "fixture-secret-token";
  const seen = [];
  await withFetch(async (request) => {
    const url = new URL(request.url);
    seen.push({ url, authorization: request.headers.get("Authorization") });
    if (url.pathname.endsWith("/blogs")) {
      return Response.json({
        data: [await fixture("draft-blog")],
        meta: { pagination: { pageCount: 1 } },
      });
    }
    return Response.json({ data: { documentId: "draft-home" } });
  }, async () => {
    await getSingle("home-page", { mode: "published" });
    const drafts = await getCollection("blog", { mode: "draft" });
    assert.equal(drafts[0].documentId, "blog-unpublished-preview");
    assert.equal(seen[0].url.searchParams.get("status"), "published");
    assert.equal(seen[0].url.searchParams.has("populate[hero][populate][media]"), true);
    assert.equal(seen[1].url.searchParams.get("status"), "draft");
    assert.equal(seen[1].url.searchParams.has("populate[thumbnail]"), true);
    assert.ok(seen.every((request) => request.authorization === "Bearer fixture-secret-token"));
  });
  delete process.env.STRAPI_TOKEN;
});
test("invalid SDK credentials become configuration errors without making a request", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.STRAPI_TOKEN = "   ";
  let requests = 0;
  try {
    await withFetch(async () => {
      requests++;
      return Response.json({ data: { documentId: "unexpected" } });
    }, async () => {
      await assert.rejects(
        getSingle("home-page", { mode: "published" }),
        (error) =>
          error instanceof StrapiRequestError &&
          error.kind === "configuration" &&
          !error.message.includes("   "),
      );
    });
    assert.equal(requests, 0);
  } finally {
    delete process.env.STRAPI_TOKEN;
  }
});
test("single and detail managers use SDK filters, return missing records, and preserve clinic URL fallback", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.ASTRO_CONTENT_MODE = "draft";
  const seen = [];
  await withFetch(async (request) => {
    const url = new URL(request.url);
    seen.push(url);
    if (url.pathname.endsWith("/home-page")) {
      return Response.json({ data: { documentId: "home" } });
    }
    if (url.searchParams.has("filters[slug][$eq]")) {
      return Response.json({ data: [] });
    }
    return Response.json({
      data: [
        { documentId: "hyphen", slug: null, clinic_name: "Oak-Park" },
        { documentId: "spaces", slug: "", clinic_name: "Crest  Hill" },
      ],
      meta: { pagination: { pageCount: 1 } },
    });
  }, async () => {
    assert.equal((await getSingle("home-page", { mode: "draft" }))?.documentId, "home");
    assert.equal(
      await getByIdentifier("blog", "slug", "missing-post", { mode: "draft" }),
      null,
    );
    assert.equal(
      (await getByIdentifier("clinic", "slug", "oak-park", { mode: "draft" }))
        ?.documentId,
      "hyphen",
    );
  });
  assert.equal(seen[0].searchParams.get("status"), "draft");
  assert.equal(seen[1].searchParams.get("filters[slug][$eq]"), "missing-post");
  assert.equal(seen[1].searchParams.get("pagination[pageSize]"), "1");
  assert.equal(seen[2].searchParams.get("filters[slug][$eq]"), "oak-park");
  assert.equal(seen[3].searchParams.has("filters[slug][$eq]"), false);
});
test("clinic lookup round-trips hyphens and repeated whitespace, prefers explicit slugs, and skips renamed clinics", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.ASTRO_CONTENT_MODE = "draft";
  const clinics = [
    { documentId: "hyphen", slug: null, clinic_name: "Oak-Park" },
    { documentId: "spaces", slug: "", clinic_name: "Crest  Hill" },
    { documentId: "explicit", slug: "oak-park", clinic_name: "Different Name" },
    { documentId: "renamed", slug: "custom", clinic_name: "Ignored Clinic" },
  ];
  for (const mode of ["published", "draft"]) {
    let requests = 0;
    let includeExplicit = false;
    await withFetch(async (request) => {
      requests++;
      const url = new URL(request.url);
      const params = url.searchParams;
      assert.equal(params.get("status"), mode);
      const available = clinics.filter(
        (clinic) => includeExplicit || clinic.documentId !== "explicit",
      );
      const requestedSlug = params.get("filters[slug][$eq]");
      const data =
        requestedSlug === null
          ? available
          : available.filter((clinic) => clinic.slug === requestedSlug);
      return Response.json({
        data,
        meta: { pagination: { pageCount: 1, total: data.length } },
      });
    }, async () => {
      for (const clinic of clinics.slice(0, 2)) {
        const path = clinicPath({ slug: clinic.slug, clinicName: clinic.clinic_name });
        const slug = path.slice("/clinics/".length, -1);
        const found = await getByIdentifier("clinic", "slug", slug, { mode });
        assert.equal(found?.documentId, clinic.documentId);
      }
      assert.equal(
        await getByIdentifier("clinic", "slug", "ignored-clinic", { mode }),
        null,
      );
      includeExplicit = true;
      requests = 0;
      assert.equal(
        (await getByIdentifier("clinic", "slug", "oak-park", { mode }))?.documentId,
        "explicit",
      );
      assert.equal(requests, 1, "an explicit CMS slug takes priority without fallback scanning");
    });
  }
});
test("malformed SDK payloads and upstream failures use safe project errors", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.STRAPI_TOKEN = "fixture-secret-token";
  await withFetch(async () => new Response("not-json"), async () => {
    await assert.rejects(
      getSingle("home-page", { mode: "published" }),
      (error) => error instanceof StrapiRequestError && error.kind === "invalid-response",
    );
  });
  await withFetch(async () => Response.json({ unexpected: true }), async () => {
    await assert.rejects(
      getSingle("home-page", { mode: "published" }),
      (error) => error instanceof StrapiRequestError && error.kind === "invalid-response",
    );
  });
  await withFetch(async () => new Response("private body", { status: 503 }), async () => {
    await assert.rejects(
      getSingle("home-page", { mode: "published" }),
      (error) =>
        error instanceof StrapiRequestError &&
        error.kind === "upstream" &&
        error.status === 503 &&
        !error.message.includes("fixture-secret-token") &&
        !error.message.includes("private body"),
    );
  });
  delete process.env.STRAPI_TOKEN;
});
test("single-type 404 is missing content and SDK abort errors are sanitized", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  await withFetch(async () => new Response("private body", { status: 404 }), async () => {
    assert.equal(await getSingle("privacy-policy", { mode: "published" }), null);
  });
  await withFetch(async () => {
    throw Object.assign(new Error("fixture transport detail"), { name: "AbortError" });
  }, async () => {
    await assert.rejects(
      getSingle("home-page", { mode: "published" }),
      (error) =>
        error instanceof StrapiRequestError &&
        error.kind === "upstream" &&
        error.message === "Strapi request timed out",
    );
  });
});
test("SDK default timeout aborts requests that have not received headers", async (context) => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  await withFetch(
    (request) => {
      markStarted();
      return new Promise((_, reject) => {
        request.signal.addEventListener(
          "abort",
          () => reject(Object.assign(new Error("abort"), { name: "AbortError" })),
          { once: true },
        );
      });
    },
    async () => {
      const request = getSingle("home-page", { mode: "published" });
      await started;
      context.mock.timers.tick(10_000);
      await assert.rejects(
        request,
        (error) =>
          error instanceof StrapiRequestError &&
          error.kind === "upstream" &&
          error.message === "Strapi request timed out",
      );
    },
  );
});
test("SDK redirects do not forward the server token across origins", async () => {
  let receivedAuthorization;
  const target = createServer((request, response) => {
    receivedAuthorization = request.headers.authorization;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: { documentId: "redirected-home" } }));
  });
  const source = createServer((_request, response) => {
    const address = target.address();
    response.writeHead(302, {
      location: `http://127.0.0.1:${address.port}/api/home-page`,
    });
    response.end();
  });
  await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
  await new Promise((resolve) => source.listen(0, "127.0.0.1", resolve));
  const address = source.address();
  process.env.GATSBY_STRAPI_API_URL = `http://127.0.0.1:${address.port}`;
  process.env.STRAPI_TOKEN = "redirect-fixture-secret";
  try {
    assert.equal(
      (await getSingle("home-page", { mode: "published" }))?.documentId,
      "redirected-home",
    );
    assert.equal(receivedAuthorization, undefined);
  } finally {
    delete process.env.STRAPI_TOKEN;
    await new Promise((resolve) => source.close(resolve));
    await new Promise((resolve) => target.close(resolve));
  }
});
test("dynamic-zone population covers FAQ, rich text and both CTA variants", () => {
  const on = POPULATE.condition.content.on;
  assert.deepEqual(Object.keys(on).sort(), [
    "generic.contact-booking-cta",
    "generic.faq",
    "generic.faq-contact-book-buttons",
    "generic.rich-text",
  ]);
  assert.equal(on["generic.faq"].populate.questions, true);
  assert.equal(Object.hasOwn(POPULATE.clinic, "body"), false);
  assert.equal(Object.hasOwn(POPULATE.review, "content"), false);
});
