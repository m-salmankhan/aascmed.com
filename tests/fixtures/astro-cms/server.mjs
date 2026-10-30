// Serves synthetic published and mutable draft content through real Strapi-shaped HTTP endpoints.
import { createServer } from 'node:http';
import qs from 'qs';
import sharp from 'sharp';
export const fixtureToken = 'fixture-private-api-token';
export const draftMarker = 'DRAFT_ONLY';
/** Make Strapi Blocks text for visible page-content assertions.
 * @param text Plain fixture copy.
 * @returns A paragraph block containing that copy.
 */
function blocks(text) {
  return [{ type: 'paragraph', children: [{ type: 'text', text }] }];
}
/** Build one complete, synthetic CMS content state.
 * @param prefix Distinct published or draft copy marker.
 * @returns Collection and singleton records suitable for the real page loaders.
 */
function contentState(prefix) {
  /** Give a fixture record stable identity and a truthful modification date.
   * @param name Stable synthetic document identifier.
   * @returns Common Strapi metadata fields.
   */
  const identity = (name) => {
    return { documentId: name, updatedAt: '2026-04-03T14:20:00.000Z' };
  };
  /** Supply a minimal homepage section in the real CMS component shape.
   * @param name Distinct visible section name.
   * @returns Heading, rich text and optional media collection.
   */
  const section = (name) => {
    return { heading: `${prefix} ${name}`, text: blocks(`${prefix} ${name} copy`), media: [] };
  };
  /** Supply one fixed/archive singleton with visible copy and SEO metadata.
   * @param name Singleton resource name.
   * @returns Serializable page fields consumed by the actual loaders.
   */
  const page = (name) => {
    return {
      ...identity(name),
      heading: `${prefix} ${name}`,
      title: `${prefix} ${name}`,
      metaDescription: `${prefix} ${name} description`,
      text: blocks(`${prefix} ${name} body`),
    };
  };
  return {
    blogs: [1, 2, 3].map((index) => ({
      ...identity(`blog-${index}`),
      title: `${prefix} Article ${index}`,
      heading: `${prefix} Article ${index}`,
      slug: `article-${index}`,
      date: `2026-03-0${index}T12:00:00.000Z`,
      description: `${prefix} article description`,
      thumbnail: null,
      content: [
        { __component: 'generic.rich-text', text: blocks(`${prefix} BLOG_BODY_${index}`) },
        { __component: 'generic.contact-booking-cta' },
      ],
    })),
    conditions: [
      {
        ...identity('condition'),
        title: `${prefix} Allergy`,
        heading: `${prefix} Allergy`,
        slug: 'allergy',
        description: `${prefix} condition description`,
        order: 1,
        thumbnail: null,
        content: [
          { __component: 'generic.rich-text', text: blocks(`${prefix} CONDITION_BODY`) },
          {
            __component: 'generic.faq',
            questions: [
              { question: `${prefix} FAQ question`, answer: blocks(`${prefix} FAQ answer`) },
            ],
          },
        ],
      },
    ],
    providers: [
      {
        ...identity('provider'),
        slug: 'doctor-example',
        name: {
          fullName: `${prefix} Example Doctor`,
          honorific: 'Dr.',
          qualificationLong: 'Doctor of Medicine',
          qualificationAbbr: 'MD',
        },
        description: `${prefix} provider description`,
        order: 1,
        image: null,
        retirementNotice: { retired: false },
        body: [{ __component: 'generic.rich-text', text: blocks(`${prefix} PROVIDER_BODY`) }],
      },
    ],
    clinics: [
      {
        ...identity('clinic'),
        title: `${prefix} Clinic`,
        clinic_name: `${prefix} Clinic </script><script>fixture-untrusted</script>`,
        slug: 'example-clinic',
        description: `${prefix} clinic description`,
        location: {
          address: '123 Example Street',
          lat: 41.8,
          long: -87.8,
          placeId: 'fixture-place',
          label_name: 'Example',
        },
        contact: { phone: '555-0100', fax: '555-0101' },
        hours: [
          {
            day: 'Monday',
            open: true,
            opening_hours: { start_time: '09:00', end_time: '17:00' },
            shot_hours: { start_time: '10:00', end_time: '16:00' },
          },
        ],
        body: blocks(`${prefix} CLINIC_BODY`),
      },
    ],
    'service-updates': [
      {
        ...identity('update'),
        title: `${prefix} Notice`,
        slug: 'notice',
        date: '2026-03-04T12:00:00.000Z',
        description: `${prefix} update description`,
        body: blocks(`${prefix} UPDATE_BODY`),
      },
    ],
    reviews: [
      {
        ...identity('review'),
        name: `${prefix} Patient`,
        stars: 5,
        content: blocks(`${prefix} REVIEW_BODY`),
        sourceName: 'Fixture reviews',
        sourceUrl: 'https://example.com/review',
      },
    ],
    announcement: {
      ...identity('announcement'),
      enabled: true,
      type: 'info',
      message: blocks(`${prefix} ANNOUNCEMENT`),
    },
    'tracking-info': {
      ...identity('tracking'),
      googleAnalyticsId: 'G-FIXTURE',
      googleTagManagerId: 'GTM-FIXTURE',
      pixelId: 'FIXTURE-PIXEL',
    },
    'home-page': {
      ...identity('home'),
      metaDescription: `${prefix} homepage description`,
      hero: section('HERO'),
      genericBelowHero: [section('GENERIC')],
      conditions: section('CONDITIONS'),
      serviceUpdates: section('UPDATES'),
      blog: section('BLOG'),
      providers: section('PROVIDERS'),
      feedback: {
        rating: 0.95,
        sourceName: 'Fixture reviews',
        sourceUrl: 'https://example.com/reviews',
        accessDate: '2026-03-01',
      },
      locations: section('LOCATIONS'),
      contact: section('CONTACT'),
    },
    ...Object.fromEntries(
      [
        'blog-archive',
        'conditions-archive',
        'clinics-archive',
        'providers-page',
        'service-update-page',
        'contact',
        'privacy-policy',
      ].map((name) => [name, page(name)]),
    ),
  };
}
/** Evaluate only the standard Strapi filter operators emitted by the page loaders.
 * @param record Fixture record or nested component.
 * @param filters Parsed SDK query filter object.
 * @returns Whether the record matches the query.
 */
function matches(record, filters = {}) {
  return Object.entries(filters).every(([key, value]) => {
    if (key === '$and') {
      return value.every((filter) => matches(record, filter));
    }
    if (key === '$or') {
      return value.some((filter) => matches(record, filter));
    }
    const field = record?.[key];
    if ('$eq' in value) {
      return String(field) === String(value.$eq);
    }
    if ('$null' in value) {
      return field == null;
    }
    if ('$notNull' in value) {
      return field != null;
    }
    return matches(field, value);
  });
}
/** Start a real loopback CMS fixture with independent published and mutable draft data.
 * @returns Origin, observed requests, mutable draft state, and an asynchronous close function.
 */
export async function startFixtureCms() {
  const published = contentState('PUBLISHED');
  const draft = contentState(draftMarker);
  for (const state of [published, draft]) {
    state.reviews.push({
      ...structuredClone(state.reviews[0]),
      documentId: 'review-two',
      name: `${state.reviews[0].name} Two`,
      content: blocks(`${state.reviews[0].name} SECOND_REVIEW_BODY`),
    });
  }
  const runtime = { mode: 'success', requests: [] };
  const image = await sharp({
    create: { width: 32, height: 24, channels: 3, background: '#1C5E38' },
  })
    .png()
    .toBuffer();
  const inlineImage = await sharp({
    create: { width: 1200, height: 800, channels: 3, background: '#1C5E38' },
  }).png().toBuffer();
  const requests = [];
  const unavailableResources = new Set();
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/runtime/contact/') {
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Allow-Headers', 'content-type');
      response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      if (request.method === 'OPTIONS') {
        response.writeHead(204).end();
        return;
      }
      let body = '';
      for await (const chunk of request) {
        body += chunk;
      }
      runtime.requests.push({
        body: JSON.parse(body),
        authorization: request.headers.authorization,
      });
      response.setHeader('content-type', 'application/json');
      if (runtime.mode === 'validation') {
        response
          .writeHead(400)
          .end(
            JSON.stringify({
              detail: { field_errors: { email_address: ['Fixture email was rejected'] } },
            }),
          );
      } else if (runtime.mode === 'error') {
        response.writeHead(503).end(JSON.stringify({ detail: 'Fixture unavailable' }));
      } else {
        response.end(JSON.stringify({ ok: true }));
      }
      return;
    }
    if (url.pathname === '/media/inline.png') {
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(inlineImage);
      return;
    }
    if (url.pathname === '/media/fixture.png') {
      response.writeHead(200, { 'content-type': 'image/png' });
      response.end(image);
      return;
    }
    const query = qs.parse(url.search.slice(1));
    requests.push({ pathname: url.pathname, query, authorization: request.headers.authorization });
    if (request.headers.authorization !== `Bearer ${fixtureToken}`) {
      response.writeHead(401).end();
      return;
    }
    const source = query.status === 'draft' ? draft : published;
    const resource = url.pathname.replace(/^\/api\//, '');
    if (unavailableResources.has(resource)) {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Synthetic CMS outage' } }));
      return;
    }
    const value = source[resource];
    response.setHeader('content-type', 'application/json');
    if (value === undefined) {
      response.writeHead(404).end(JSON.stringify({ error: { status: 404 } }));
      return;
    }
    if (!Array.isArray(value)) {
      response.end(JSON.stringify({ data: value }));
      return;
    }
    let data = value.filter((record) => matches(record, query.filters));
    const sorting = typeof query.sort === 'string' ? [query.sort] : query.sort || [];
    data.sort((left, right) => {
      for (const item of sorting) {
        const [field, direction] = item.split(':');
        const a = left[field];
        const b = right[field];
        const result =
          typeof a === 'number' ? a - b : String(a ?? '').localeCompare(String(b ?? ''));
        if (result) {
          return direction === 'desc' ? -result : result;
        }
      }
      return 0;
    });
    const total = data.length;
    const pageSize = Math.min(Number(query.pagination?.pageSize || 100), 2);
    const page = Number(query.pagination?.page || 1);
    data = data.slice((page - 1) * pageSize, page * pageSize);
    if (query.fields) {
      const fields = typeof query.fields === 'string' ? [query.fields] : query.fields;
      data = data.map((record) =>
        Object.fromEntries(['documentId', ...fields].map((field) => [field, record[field]])),
      );
    }
    response.end(
      JSON.stringify({
        data,
        meta: { pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } },
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Real image bytes exercise Astro's authorized remote-image handling without external services.
  for (const state of [published, draft]) {
    const media = {
      url: `${origin}/media/fixture.png`,
      alternativeText: 'Fixture thumbnail',
      width: 32,
      height: 24,
      mime: 'image/png',
    };
    state.blogs.forEach((record) => {
      record.thumbnail = media;
    });
    state.blogs[0].content[0].text.push({
      type: 'image',
      image: { url: '/media/inline.png', alternativeText: 'Fixture inline image', width: 1200, height: 800, mime: 'image/png' },
      children: [{ type: 'text', text: '' }],
    });
    state.conditions[0].thumbnail = media;
    state.providers[0].image = media;
    state['home-page'].hero.media = [media];
  }
  return {
    origin,
    requests,
    unavailableResources,
    runtime,
    published,
    draft,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
