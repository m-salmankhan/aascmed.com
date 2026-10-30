// Checks Strapi request, mapping, pagination and publication contracts using isolated fixtures.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createServer } from "node:http";
import { getPublishedRouteManifest } from "../../astro/src/server/content/routes.ts";
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
  createClient,
  readRecords,
  StrapiRequestError,
} from "../../astro/src/server/content/strapi.ts";
import {
  getAnnouncement,
  getBlogArchive,
  getBlogBySlug,
  getBlogs,
  getClinicBySlug,
  getClinicsArchive,
  getConditions,
  getProviders,
  getConditionsArchive,
  getContact,
  getHomePage,
  getPrivacyPolicy,
  getProvidersPage,
  getPublishedCollections,
  getServiceUpdateBySlug,
  getServiceUpdatePage,
  getServiceUpdates,
  getTrackingInfo,
} from "../../astro/src/server/content/loaders.ts";
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
/** Run loader requests through a temporary fetch mock and restore the real SDK transport.
 * @param {(request: Request) => Promise<Response>} fetcher Mock SDK response behavior.
 * @param {() => Promise<unknown>} operation Loader calls that exercise the official SDK.
 * @returns The loader result after all mocked requests complete.
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
/** Collect a lazy loader only in assertions that explicitly cover full iteration.
 * @param {AsyncIterable<unknown>} records Loader iterable under test.
 * @returns {Promise<unknown[]>} All records yielded by the fixture.
 */
async function collect(records) {
  const result = [];
  for await (const record of records) result.push(record);
  return result;
}
test("blog loader exposes its SDK resource, nested query and bounded pagination", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  const requests = [];
  const blogs = await withFetch(async (request) => {
    requests.push(request);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("pagination[page]"));
    const data = Array.from({ length: page === 1 ? 100 : 1 }, (_, index) => ({
      documentId: `doc-${(page - 1) * 100 + index}`,
      slug: `post-${(page - 1) * 100 + index}`,
      title: "Test post",
      heading: "Test post",
      date: "2026-01-01",
    }));
    return Response.json({ data, meta: { pagination: { pageCount: 2, total: 101 } } });
  }, () => collect(getBlogs("published")));
  assert.equal(blogs.length, 101);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    const url = new URL(request.url);
    assert.equal(url.pathname, "/api/blogs");
    assert.equal(url.searchParams.get("status"), "published");
    assert.equal(url.searchParams.get("pagination[pageSize]"), "100");
    assert.equal(url.searchParams.get("sort[0]"), "date:desc");
    assert.equal(url.searchParams.get("sort[1]"), "id:asc", "date ties retain Gatsby CMS source order");
    assert.equal(url.searchParams.get("populate[thumbnail]"), "true");
    assert.equal(
      url.searchParams.get("populate[content][on][clinics.map][populate]"),
      "*",
    );
    assert.equal(request.headers.get("Cache-Control"), null);
  }
  assert.deepEqual(
    requests.map((request) => new URL(request.url).searchParams.get("pagination[page]")),
    ["1", "2"],
  );
});
test("collection iterators fetch the next bounded page only when advanced", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  const requests = [];
  await withFetch(async (request) => {
    requests.push(request);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("pagination[page]"));
    const pageSize = Number(url.searchParams.get("pagination[pageSize]"));
    const data = Array.from({ length: page === 1 ? pageSize : 1 }, (_, index) => ({
      documentId: `doc-${page}-${index}`,
      slug: `post-${page}-${index}`,
      title: "Test post",
      heading: "Test post",
      date: "2026-01-01",
    }));
    return Response.json({ data, meta: { pagination: { pageCount: 3 } } });
  }, async () => {
    const blogs = getBlogs("published", { pageSize: 2 });
    const iterator = blogs[Symbol.asyncIterator]();
    assert.equal(requests.length, 0, "constructing the loader does not request page one");
    assert.equal((await iterator.next()).value.documentId, "doc-1-0");
    assert.equal(requests.length, 1);
    assert.equal(new URL(requests[0].url).searchParams.get("pagination[pageSize]"), "2");
    assert.equal((await iterator.next()).value.documentId, "doc-1-1");
    assert.equal(requests.length, 1, "the current page is buffered without prefetching");
    await iterator.return();
    assert.equal(requests.length, 1, "closing early never requests later pages");
  });
});
test("published collections stay lazy and expose SDK resources and population as consumed", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test/custom/api";
  const requests = [];
  await withFetch(async (request) => {
    requests.push(request);
    return Response.json({ data: [], meta: { pagination: { pageCount: 1, total: 0 } } });
  }, async () => {
    const collections = await getPublishedCollections();
    assert.equal(requests.length, 0, "creating iterators does not fetch any collection");
    for (const collection of Object.values(collections)) {
      for await (const _record of collection) break;
    }
  });
  const byPath = new Map(requests.map((request) => [new URL(request.url).pathname, request]));
  assert.deepEqual([...byPath.keys()].sort(), [
    "/custom/api/blogs",
    "/custom/api/clinics",
    "/custom/api/conditions",
    "/custom/api/providers",
    "/custom/api/reviews",
    "/custom/api/service-updates",
  ]);
  assert.ok(requests.every((request) => new URL(request.url).searchParams.get("status") === "published"));
  assert.ok(requests.every((request) => request.headers.get("Cache-Control") === null));
  assert.equal(
    new URL(byPath.get("/custom/api/clinics").url).searchParams.get(
      "populate[hours][populate][opening_hours]",
    ),
    "true",
  );
  assert.equal(
    new URL(byPath.get("/custom/api/conditions").url).searchParams.get(
      "populate[content][on][generic.faq][populate][questions]",
    ),
    "true",
  );
  assert.equal(
    new URL(byPath.get("/custom/api/providers").url).searchParams.has(
      "populate[body][on][generic.rich-text][populate]",
    ),
    true,
  );
});
test("ordered collections preserve missing values last through explicit SDK filters", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.ASTRO_CONTENT_MODE = "draft";
  const requests = [];
  const respond = async (request) => {
    requests.push(request);
    const params = new URL(request.url).searchParams;
    const path = new URL(request.url).pathname;
    if (path.endsWith("/service-updates")) {
      const dated = params.get("filters[date][$notNull]") === "true";
      return Response.json({
        data: [{
          documentId: dated ? "dated" : "undated",
          slug: "update",
          title: "Update",
          date: dated ? "2026-04-01" : null,
        }],
        meta: { pagination: { pageCount: 1 } },
      });
    }
    const ordered = params.get("filters[order][$notNull]") === "true";
    return Response.json({
      data: [{
        documentId: ordered ? "ordered" : "unordered",
        slug: ordered ? "ordered" : "unordered",
        title: "Record",
        order: ordered ? 1 : null,
      }],
      meta: { pagination: { pageCount: 1 } },
    });
  };
  const { conditions, providers, updates } = await withFetch(respond, async () => ({
    conditions: await collect(getConditions("draft")),
    providers: await collect(getProviders("draft")),
    updates: await collect(getServiceUpdates("draft")),
  }));
  for (const request of requests) {
    const sort = [...new URL(request.url).searchParams.entries()]
      .filter(([name]) => name.startsWith("sort["))
      .map(([, value]) => value);
    assert.equal(sort.at(-1), "id:asc", "display ties retain the CMS source order");
  }
  assert.deepEqual(conditions.map((record) => record.documentId), ["ordered", "unordered"]);
  assert.deepEqual(providers.map((record) => record.documentId), ["ordered", "unordered"]);
  assert.deepEqual(updates.map((record) => record.documentId), ["dated", "undated"]);
  for (const path of ["/api/conditions", "/api/providers"]) {
    const familyRequests = requests.filter(
      (request) => new URL(request.url).pathname === path,
    );
    assert.equal(familyRequests.length, 2);
    assert.equal(
      new URL(familyRequests[0].url).searchParams.get("filters[order][$notNull]"),
      "true",
    );
    assert.equal(
      new URL(familyRequests[1].url).searchParams.get("filters[order][$null]"),
      "true",
    );
  }
  const updateRequests = requests.filter(
    (request) => new URL(request.url).pathname === "/api/service-updates",
  );
  assert.equal(updateRequests.length, 2);
  assert.equal(
    new URL(updateRequests[0].url).searchParams.get("filters[date][$notNull]"),
    "true",
  );
  assert.equal(
    new URL(updateRequests[1].url).searchParams.get("filters[date][$null]"),
    "true",
  );
});
test("all CMS single loaders address their explicit SDK single resources", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  const paths = [];
  await withFetch(async (request) => {
    paths.push(new URL(request.url).pathname);
    const name = paths.at(-1).split("/").at(-1);
    return Response.json({ data: { documentId: name } });
  }, async () => {
    await Promise.all([
      getAnnouncement("published"),
      getBlogArchive("published"),
      getConditionsArchive("published"),
      getClinicsArchive("published"),
      getContact("published"),
      getProvidersPage("published"),
      getServiceUpdatePage("published"),
      getPrivacyPolicy("published"),
      getHomePage("published"),
      getTrackingInfo("published"),
    ]);
  });
  assert.deepEqual(paths.sort(), [
    "/api/announcement",
    "/api/blog-archive",
    "/api/clinics-archive",
    "/api/conditions-archive",
    "/api/contact",
    "/api/home-page",
    "/api/privacy-policy",
    "/api/providers-page",
    "/api/service-update-page",
    "/api/tracking-info",
  ]);
});
test("detail loaders put status, slug filter, and population beside their SDK resources", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.ASTRO_CONTENT_MODE = "draft";
  const requests = [];
  await withFetch(async (request) => {
    requests.push(request);
    return Response.json({ data: [{ documentId: "post", slug: "example", title: "Example" }] });
  }, async () => {
    await getBlogBySlug("example", "draft");
    await getServiceUpdateBySlug("update", "draft");
  });
  assert.equal(new URL(requests[0].url).pathname, "/api/blogs");
  assert.equal(new URL(requests[0].url).searchParams.get("status"), "draft");
  assert.equal(new URL(requests[0].url).searchParams.get("filters[slug][$eq]"), "example");
  assert.equal(new URL(requests[0].url).searchParams.has("populate[thumbnail]"), true);
  assert.equal(requests[0].headers.get("Cache-Control"), "no-store");
  assert.equal(new URL(requests[1].url).pathname, "/api/service-updates");
  assert.equal(new URL(requests[1].url).searchParams.get("filters[slug][$eq]"), "update");
});
test("published collection reads start only when consumed, and draft mode is denied outside preview", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  delete process.env.ASTRO_CONTENT_MODE;
  let requests = 0;
  await assert.rejects(
    collect(getBlogs("draft")),
    (error) => error instanceof StrapiRequestError && error.kind === "configuration",
  );
  await withFetch(async () => {
    requests++;
    return Response.json({ data: [], meta: { pagination: { pageCount: 1, total: 0 } } });
  }, async () => {
    const first = await getPublishedCollections();
    assert.equal(requests, 0);
    await collect(first.blogs);
    assert.equal(requests, 1);
    const second = await getPublishedCollections();
    assert.equal(requests, 1);
    await collect(second.blogs);
    assert.equal(requests, 2);
  });
});
test("collection iterator stops at the safety cap and supports a configured batch size", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  let requests = 0;
  const client = createClient("published");
  await withFetch(async () => {
    requests++;
    return Response.json({
      data: [{ documentId: "review-1" }],
      meta: { pagination: { pageCount: 10001 } },
    });
  }, async () => {
    await assert.rejects(
      collect(readRecords(client.collection("reviews"), { status: "published" }, 2)),
      (error) =>
        error instanceof StrapiRequestError &&
        error.kind === "upstream" &&
        error.message.includes("10000 page"),
    );
  });
  assert.equal(requests, 1);
  await assert.rejects(
    collect(readRecords(client.collection("reviews"), { status: "published" }, 101)),
    (error) => error instanceof StrapiRequestError && error.kind === "configuration",
  );
});
test("clinic slug fallback handles hyphens and whitespace, prioritizes explicit slugs, and ignores renamed clinics", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.ASTRO_CONTENT_MODE = "draft";
  const clinics = [
    { documentId: "hyphen", slug: null, clinic_name: "Oak-Park" },
    { documentId: "spaces", slug: "", clinic_name: "Crest  Hill" },
    { documentId: "explicit", slug: "oak-park", clinic_name: "Different Name" },
    { documentId: "renamed", slug: "custom", clinic_name: "Ignored Clinic" },
    { documentId: "invalid", slug: "bad?slug", clinic_name: "Unroutable" },
  ];
  for (const mode of ["published", "draft"]) {
    let includeExplicit = false;
    await withFetch(async (request) => {
      const params = new URL(request.url).searchParams;
      assert.equal(params.get("status"), mode);
      const available = clinics.filter(
        (clinic) => includeExplicit || clinic.documentId !== "explicit",
      );
      const slug = params.get("filters[slug][$eq]");
      const data = slug === null ? available : available.filter((clinic) => clinic.slug === slug);
      return Response.json({ data, meta: { pagination: { pageCount: 1, total: data.length } } });
    }, async () => {
      for (const clinic of clinics.slice(0, 2)) {
        const path = clinicPath({ slug: clinic.slug, clinicName: clinic.clinic_name });
        const slug = path.slice("/clinics/".length, -1);
        assert.equal((await getClinicBySlug(slug, mode))?.documentId, clinic.documentId);
      }
      assert.equal(await getClinicBySlug("ignored-clinic", mode), null);
      includeExplicit = true;
      assert.equal((await getClinicBySlug("oak-park", mode))?.documentId, "explicit");
    });
  }
});
test("clinic fallback stops after the page containing its route match", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.ASTRO_CONTENT_MODE = "draft";
  const requests = [];
  const clinic = await withFetch(async (request) => {
    requests.push(request);
    const params = new URL(request.url).searchParams;
    if (params.has("filters[slug][$eq]")) {
      return Response.json({ data: [], meta: { pagination: { pageCount: 1 } } });
    }
    const page = params.get("pagination[page]");
    return Response.json({
      data: page === "1" ? [{ documentId: "oak", clinic_name: "Oak Park" }] : [],
      meta: { pagination: { pageCount: 3 } },
    });
  }, () => getClinicBySlug("oak-park", "draft"));
  assert.equal(clinic?.documentId, "oak");
  assert.equal(requests.length, 2, "the second fallback page is never requested");
});
test("published validation rejects unroutable content while draft records remain previewable", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  const respond = async () => Response.json({
    data: [{ documentId: "unroutable", slug: "", title: "Incomplete" }],
    meta: { pagination: { pageCount: 1 } },
  });
  await withFetch(respond, async () => {
    await assert.rejects(
      collect(getBlogs("published")),
      /Published blog record failed validation/,
    );
  });
  process.env.ASTRO_CONTENT_MODE = "draft";
  const drafts = await withFetch(respond, () => collect(getBlogs("draft")));
  assert.equal(drafts[0].documentId, "unroutable");
});
test("single 404, malformed response and upstream errors retain distinct safe outcomes", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  await withFetch(async () => new Response("private body", { status: 404 }), async () => {
    assert.equal(await getPrivacyPolicy("published"), null);
  });
  await withFetch(async () => new Response("not-json"), async () => {
    await assert.rejects(
      getHomePage("published"),
      (error) => error instanceof StrapiRequestError && error.kind === "invalid-response",
    );
  });
  await withFetch(async () => Response.json({ unexpected: true }), async () => {
    await assert.rejects(
      getHomePage("published"),
      (error) => error instanceof StrapiRequestError && error.kind === "invalid-response",
    );
  });
  process.env.STRAPI_TOKEN = "fixture-secret-token";
  await withFetch(async () => new Response("private body", { status: 503 }), async () => {
    await assert.rejects(
      getHomePage("published"),
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
test("blank SDK credentials are configuration errors without network access", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  process.env.STRAPI_TOKEN = "   ";
  let requests = 0;
  try {
    await withFetch(async () => {
      requests++;
      return Response.json({ data: { documentId: "unexpected" } });
    }, async () => {
      await assert.rejects(
        getHomePage("published"),
        (error) => error instanceof StrapiRequestError && error.kind === "configuration",
      );
    });
    assert.equal(requests, 0);
  } finally {
    delete process.env.STRAPI_TOKEN;
  }
});
test("SDK timeout aborts requests waiting for response headers", async (context) => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  await withFetch((request) => {
    markStarted();
    return new Promise((_, reject) => {
      request.signal.addEventListener(
        "abort",
        () => reject(Object.assign(new Error("abort"), { name: "AbortError" })),
        { once: true },
      );
    });
  }, async () => {
    const pending = getHomePage("published");
    await started;
    context.mock.timers.tick(10_000);
    await assert.rejects(
      pending,
      (error) => error instanceof StrapiRequestError && error.message === "Strapi request timed out",
    );
  });
});
test("SDK cross-origin redirects strip the server token", async () => {
  let receivedAuthorization;
  const target = createServer((request, response) => {
    receivedAuthorization = request.headers.authorization;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ data: { documentId: "redirected-home" } }));
  });
  const source = createServer((_request, response) => {
    const address = target.address();
    response.writeHead(302, { location: `http://127.0.0.1:${address.port}/api/home-page` });
    response.end();
  });
  await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
  await new Promise((resolve) => source.listen(0, "127.0.0.1", resolve));
  const address = source.address();
  process.env.GATSBY_STRAPI_API_URL = `http://127.0.0.1:${address.port}`;
  process.env.STRAPI_TOKEN = "redirect-fixture-secret";
  try {
    assert.equal((await getHomePage("published"))?.documentId, "redirected-home");
    assert.equal(receivedAuthorization, undefined);
  } finally {
    delete process.env.STRAPI_TOKEN;
    await new Promise((resolve) => source.close(resolve));
    await new Promise((resolve) => target.close(resolve));
  }
});

test("published route references request scalar fields without expanded page content", async () => {
  process.env.GATSBY_STRAPI_API_URL = "https://cms.example.test";
  const requests = [];
  const routes = await withFetch(async (request) => {
    const url = new URL(request.url);
    requests.push(url);
    assert.equal(url.searchParams.get("status"), "published");
    assert.equal(url.searchParams.get("pagination[pageSize]"), "100");
    assert.ok([...url.searchParams.keys()].every((key) => !key.startsWith("populate")));
    const fields = [...url.searchParams].filter(([key]) => key.startsWith("fields")).map(([, value]) => value);
    assert.ok(fields.includes("updatedAt"));
    assert.ok(!fields.includes("body") && !fields.includes("content"));
    const data = url.pathname.endsWith("/clinics")
      ? [{ documentId: "clinic-ref", clinic_name: "Crest Hill", updatedAt: "2026-04-03T14:20:00.000Z" }]
      : [];
    return Response.json({ data, meta: { pagination: { pageCount: 1, total: data.length } } });
  }, getPublishedRouteManifest);
  assert.equal(requests.length, 5);
  assert.deepEqual(routes, [{ pathname: "/clinics/crest-hill/", kind: "clinic", updatedAt: "2026-04-03T14:20:00.000Z" }]);
});
