// Loads Strapi collection and single records into the shared content view models.
import type {
  AnnouncementSettings,
  BlogRecord,
  ClinicRecord,
  ConditionRecord,
  ContentPageRecord,
  ContentRecord,
  HomePageRecord,
  ProviderRecord,
  ReviewRecord,
  ServiceUpdateRecord,
  TrackingSettings,
} from "../../../../src/shared/content/models.ts";
import { clinicPath } from "../../../../src/shared/content/urls.ts";
import {
  validateContentRecord,
  type ContentFamily,
  type ContentMode,
} from "../../../../src/shared/content/validation.ts";
import { createClient, readFirst, readRecords, readSingle } from "./strapi.ts";
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
} from "./mapping.ts";
/** Validate one route-bearing record at the published-content boundary.
 * @param record Normalized content record to validate.
 * @param family Route convention used for the records.
 * @param mode Draft records may be incomplete; published records must have public routes.
 * @returns Nothing; throws if a published record is invalid.
 */
function validateRouteRecord(
  record: ContentRecord,
  family: ContentFamily,
  mode: ContentMode,
): void {
  if (mode === "draft") {
    return;
  }
  const issues = validateContentRecord(record, family, mode);
  if (issues.length) {
    throw new Error(`Published ${family} record failed validation: ${issues.join(", ")}`);
  }
}
/** Optional batch size for collection loaders; accepted values range from 1 through 100. */
export interface CollectionReadOptions {
  pageSize?: number;
}
/** Relations requested when loading blog cards and detail pages. */
const blogPopulate = {
  thumbnail: true,
  content: {
    on: {
      "generic.contact-booking-cta": { populate: "*" },
      "clinics.map": { populate: "*" },
      "generic.rich-text": { populate: "*" },
    },
  },
};
/** Clinic relations needed by location and contact views. */
const clinicPopulate = {
  location: true,
  contact: true,
  hours: { populate: { opening_hours: true, shot_hours: true } },
};
/** Dynamic-zone relations rendered by condition views. */
const conditionPopulate = {
  thumbnail: true,
  content: {
    on: {
      "generic.contact-booking-cta": { populate: "*" },
      "generic.faq-contact-book-buttons": { populate: "*" },
      "generic.rich-text": { populate: "*" },
      "generic.faq": { populate: { questions: true } },
    },
  },
};
/** Profile relations and blocks rendered by provider views. */
const providerPopulate = {
  image: true,
  name: true,
  review: true,
  retirementNotice: true,
  body: {
    on: {
      "generic.rich-text": { populate: "*" },
      "generic.contact-booking-cta": { populate: "*" },
      "generic.faq-contact-book-buttons": { populate: "*" },
    },
  },
};
/** Homepage sections and their media used by the shared home view. */
const homePagePopulate = {
  hero: { populate: { media: true } },
  genericBelowHero: { populate: { media: true } },
  conditions: { populate: { media: true } },
  serviceUpdates: { populate: { media: true } },
  blog: { populate: { media: true } },
  providers: { populate: { media: true } },
  feedback: true,
  locations: { populate: { media: true } },
  contact: { populate: { media: true } },
};
/** Load and normalize published or draft blogs, ordered by date.
 * @param mode Content state requested from Strapi.
 * @param options Optional bounded page size for the CMS requests.
 * @returns Blogs in CMS order, fetched one page at a time.
 */
export async function* getBlogs(
  mode: ContentMode,
  options: CollectionReadOptions = {},
): AsyncGenerator<BlogRecord> {
  const client = createClient(mode);
  const mediaOrigin = new URL(client.baseURL).origin;
  for await (const entity of readRecords(client.collection("blogs"), {
    status: mode,
    sort: ["date:desc", "documentId:asc"],
    populate: blogPopulate,
  }, options.pageSize)) {
    const record = mapStrapiBlog(entity, mediaOrigin);
    validateRouteRecord(record, "blog", mode);
    yield record;
  }
}
/** Load and normalize clinics with locations, contacts, and hours populated.
 * @param mode Content state requested from Strapi.
 * @param options Optional bounded page size for the CMS requests.
 * @returns Clinics in CMS order, fetched one page at a time.
 */
export async function* getClinics(
  mode: ContentMode,
  options: CollectionReadOptions = {},
): AsyncGenerator<ClinicRecord> {
  const client = createClient(mode);
  for await (const entity of readRecords(client.collection("clinics"), {
    status: mode,
    sort: ["documentId:asc"],
    populate: clinicPopulate,
  }, options.pageSize)) {
    const record = mapStrapiClinic(entity);
    validateRouteRecord(record, "clinic", mode);
    yield record;
  }
}
/** Load and normalize conditions in display order with their content blocks populated.
 * @param mode Content state requested from Strapi.
 * @param options Optional bounded page size for the CMS requests.
 * @returns Conditions ordered by display order, fetched one page at a time.
 */
export async function* getConditions(
  mode: ContentMode,
  options: CollectionReadOptions = {},
): AsyncGenerator<ConditionRecord> {
  const client = createClient(mode);
  const mediaOrigin = new URL(client.baseURL).origin;
  // Query present orders first, then missing orders, to keep nulls last without materializing.
  for (const orderedQuery of [
    { filters: { order: { $notNull: true } }, sort: ["order:asc", "documentId:asc"] },
    { filters: { order: { $null: true } }, sort: ["documentId:asc"] },
  ]) {
    for await (const entity of readRecords(client.collection("conditions"), {
      status: mode,
      ...orderedQuery,
      populate: conditionPopulate,
    }, options.pageSize)) {
      const record = mapStrapiCondition(entity, mediaOrigin);
      validateRouteRecord(record, "condition", mode);
      yield record;
    }
  }
}
/** Load and normalize providers in display order with profile blocks populated.
 * @param mode Content state requested from Strapi.
 * @param options Optional bounded page size for the CMS requests.
 * @returns Providers ordered by display order, fetched one page at a time.
 */
export async function* getProviders(
  mode: ContentMode,
  options: CollectionReadOptions = {},
): AsyncGenerator<ProviderRecord> {
  const client = createClient(mode);
  const mediaOrigin = new URL(client.baseURL).origin;
  // Query present orders first, then missing orders, to keep nulls last without materializing.
  for (const orderedQuery of [
    { filters: { order: { $notNull: true } }, sort: ["order:asc", "documentId:asc"] },
    { filters: { order: { $null: true } }, sort: ["documentId:asc"] },
  ]) {
    for await (const entity of readRecords(client.collection("providers"), {
      status: mode,
      ...orderedQuery,
      populate: providerPopulate,
    }, options.pageSize)) {
      const record = mapStrapiProvider(entity, mediaOrigin);
      validateRouteRecord(record, "provider", mode);
      yield record;
    }
  }
}
/** Load and normalize service updates, newest first.
 * @param mode Content state requested from Strapi.
 * @param options Optional bounded page size for the CMS requests.
 * @returns Updates newest first, with undated records last, fetched one page at a time.
 */
export async function* getServiceUpdates(
  mode: ContentMode,
  options: CollectionReadOptions = {},
): AsyncGenerator<ServiceUpdateRecord> {
  const client = createClient(mode);
  // Query dated updates first, then undated updates, to keep nulls last without materializing.
  for (const orderedQuery of [
    { filters: { date: { $notNull: true } }, sort: ["date:desc", "documentId:asc"] },
    { filters: { date: { $null: true } }, sort: ["documentId:asc"] },
  ]) {
    for await (const entity of readRecords(client.collection("service-updates"), {
      status: mode,
      ...orderedQuery,
    }, options.pageSize)) {
      const record = mapStrapiServiceUpdate(entity);
      validateRouteRecord(record, "serviceUpdate", mode);
      yield record;
    }
  }
}
/** Load and normalize patient reviews.
 * @param mode Content state requested from Strapi.
 * @param options Optional bounded page size for the CMS requests.
 * @returns Reviews in document ID order, fetched one page at a time.
 */
export async function* getReviews(
  mode: ContentMode,
  options: CollectionReadOptions = {},
): AsyncGenerator<ReviewRecord> {
  const client = createClient(mode);
  for await (const entity of readRecords(client.collection("reviews"), {
    status: mode,
    sort: ["documentId:asc"],
  }, options.pageSize)) {
    yield mapStrapiReview(entity);
  }
}
/** Find one blog by its route slug using the published/draft collection query.
 * @param slug Requested blog slug.
 * @param mode Content state requested from Strapi.
 * @returns The mapped blog or null when missing; invalid routes and upstream failures throw.
 */
export async function getBlogBySlug(
  slug: string,
  mode: ContentMode,
): Promise<BlogRecord | null> {
  if (!slug.trim()) {
    return null;
  }
  const client = createClient(mode);
  const entity = await readFirst(client.collection("blogs"), {
    status: mode,
    filters: { slug: { $eq: slug } },
    populate: blogPopulate,
    pagination: { page: 1, pageSize: 1 },
  });
  if (!entity) {
    return null;
  }
  const record = mapStrapiBlog(entity, new URL(client.baseURL).origin);
  validateRouteRecord(record, "blog", mode);
  return record;
}
/** Find one condition by its route slug.
 * @param slug Requested condition slug.
 * @param mode Content state requested from Strapi.
 * @returns The mapped condition or null when missing; invalid routes and upstream failures throw.
 */
export async function getConditionBySlug(
  slug: string,
  mode: ContentMode,
): Promise<ConditionRecord | null> {
  if (!slug.trim()) {
    return null;
  }
  const client = createClient(mode);
  const entity = await readFirst(client.collection("conditions"), {
    status: mode,
    filters: { slug: { $eq: slug } },
    populate: conditionPopulate,
    pagination: { page: 1, pageSize: 1 },
  });
  if (!entity) {
    return null;
  }
  const record = mapStrapiCondition(entity, new URL(client.baseURL).origin);
  validateRouteRecord(record, "condition", mode);
  return record;
}
/** Find one provider by its route slug.
 * @param slug Requested provider slug.
 * @param mode Content state requested from Strapi.
 * @returns The mapped provider or null when missing; invalid routes and upstream failures throw.
 */
export async function getProviderBySlug(
  slug: string,
  mode: ContentMode,
): Promise<ProviderRecord | null> {
  if (!slug.trim()) {
    return null;
  }
  const client = createClient(mode);
  const entity = await readFirst(client.collection("providers"), {
    status: mode,
    filters: { slug: { $eq: slug } },
    populate: providerPopulate,
    pagination: { page: 1, pageSize: 1 },
  });
  if (!entity) {
    return null;
  }
  const record = mapStrapiProvider(entity, new URL(client.baseURL).origin);
  validateRouteRecord(record, "provider", mode);
  return record;
}
/** Find a clinic by slug and fall back to its name-derived route when no explicit slug matches.
 * @param slug Requested clinic route slug.
 * @param mode Content state requested from Strapi.
 * @returns The mapped clinic or null when missing; invalid routes and upstream failures throw.
 */
export async function getClinicBySlug(
  slug: string,
  mode: ContentMode,
): Promise<ClinicRecord | null> {
  if (!slug.trim()) {
    return null;
  }
  const client = createClient(mode);
  const entity = await readFirst(client.collection("clinics"), {
    status: mode,
    filters: { slug: { $eq: slug } },
    populate: clinicPopulate,
    pagination: { page: 1, pageSize: 1 },
  });
  if (entity) {
    const record = mapStrapiClinic(entity);
    validateRouteRecord(record, "clinic", mode);
    return record;
  }
  for await (const entity of readRecords(client.collection("clinics"), {
    status: mode,
    sort: ["documentId:asc"],
    populate: clinicPopulate,
  })) {
    const clinic = mapStrapiClinic(entity);
    if (
      !clinic.slug &&
      clinic.clinicName &&
      clinicPath({ slug: null, clinicName: clinic.clinicName }) === `/clinics/${slug}/`
    ) {
      validateRouteRecord(clinic, "clinic", mode);
      return clinic;
    }
  }
  return null;
}
/** Find one service update by its route slug.
 * @param slug Requested service update slug.
 * @param mode Content state requested from Strapi.
 * @returns The mapped update or null when missing; invalid routes and upstream failures throw.
 */
export async function getServiceUpdateBySlug(
  slug: string,
  mode: ContentMode,
): Promise<ServiceUpdateRecord | null> {
  if (!slug.trim()) {
    return null;
  }
  const client = createClient(mode);
  const entity = await readFirst(client.collection("service-updates"), {
    status: mode,
    filters: { slug: { $eq: slug } },
    pagination: { page: 1, pageSize: 1 },
  });
  if (!entity) {
    return null;
  }
  const record = mapStrapiServiceUpdate(entity);
  validateRouteRecord(record, "serviceUpdate", mode);
  return record;
}
/** Load and normalize the announcement single type.
 * @param mode Content state requested from Strapi.
 * @returns Mapped announcement or null when missing; upstream failures throw.
 */
export async function getAnnouncement(mode: ContentMode): Promise<AnnouncementSettings | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("announcement"), { status: mode });
  return entity ? mapStrapiAnnouncement(entity) : null;
}
/** Load and normalize the blog archive page.
 * @param mode Content state requested from Strapi.
 * @returns Mapped page or null when missing; upstream failures throw.
 */
export async function getBlogArchive(mode: ContentMode): Promise<ContentPageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("blog-archive"), { status: mode });
  return entity ? mapStrapiPage(entity) : null;
}
/** Load and normalize the conditions archive page.
 * @param mode Content state requested from Strapi.
 * @returns Mapped page or null when missing; upstream failures throw.
 */
export async function getConditionsArchive(mode: ContentMode): Promise<ContentPageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("conditions-archive"), { status: mode });
  return entity ? mapStrapiPage(entity) : null;
}
/** Load and normalize the clinics archive page.
 * @param mode Content state requested from Strapi.
 * @returns Mapped page or null when missing; upstream failures throw.
 */
export async function getClinicsArchive(mode: ContentMode): Promise<ContentPageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("clinics-archive"), { status: mode });
  return entity ? mapStrapiPage(entity) : null;
}
/** Load and normalize the contact page.
 * @param mode Content state requested from Strapi.
 * @returns Mapped page or null when missing; upstream failures throw.
 */
export async function getContact(mode: ContentMode): Promise<ContentPageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("contact"), { status: mode });
  return entity ? mapStrapiPage(entity) : null;
}
/** Load and normalize the providers page.
 * @param mode Content state requested from Strapi.
 * @returns Mapped page or null when missing; upstream failures throw.
 */
export async function getProvidersPage(mode: ContentMode): Promise<ContentPageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("providers-page"), { status: mode });
  return entity ? mapStrapiPage(entity) : null;
}
/** Load and normalize the service updates page.
 * @param mode Content state requested from Strapi.
 * @returns Mapped page or null when missing; upstream failures throw.
 */
export async function getServiceUpdatePage(mode: ContentMode): Promise<ContentPageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("service-update-page"), { status: mode });
  return entity ? mapStrapiPage(entity) : null;
}
/** Load and normalize the privacy policy page.
 * @param mode Content state requested from Strapi.
 * @returns Mapped page or null when missing; upstream failures throw.
 */
export async function getPrivacyPolicy(mode: ContentMode): Promise<ContentPageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("privacy-policy"), { status: mode });
  return entity ? mapStrapiPage(entity) : null;
}
/** Load the homepage with its display sections and their media populated.
 * @param mode Content state requested from Strapi.
 * @returns Mapped homepage or null when missing; upstream failures throw.
 */
export async function getHomePage(mode: ContentMode): Promise<HomePageRecord | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("home-page"), {
    status: mode,
    populate: homePagePopulate,
  });
  return entity ? mapStrapiHomePage(entity, new URL(client.baseURL).origin) : null;
}
/** Load and normalize the tracking settings single type.
 * @param mode Content state requested from Strapi.
 * @returns Mapped settings or null when missing; upstream failures throw.
 */
export async function getTrackingInfo(mode: ContentMode): Promise<TrackingSettings | null> {
  const client = createClient(mode);
  const entity = await readSingle(client.single("tracking-info"), { status: mode });
  return entity ? mapStrapiTrackingInfo(entity) : null;
}
/** Published collection records used by static builds and the public route manifest. */
export interface PublishedCollections {
  blogs: AsyncIterable<BlogRecord>;
  clinics: AsyncIterable<ClinicRecord>;
  conditions: AsyncIterable<ConditionRecord>;
  providers: AsyncIterable<ProviderRecord>;
  serviceUpdates: AsyncIterable<ServiceUpdateRecord>;
  reviews: AsyncIterable<ReviewRecord>;
}
/** Create lazy iterators for the published collections without starting CMS requests.
 * @param options Optional bounded CMS page size shared by every collection iterator.
 * @returns Collection iterators that fetch and map records only as consumers advance them.
 */
export async function getPublishedCollections(
  options: CollectionReadOptions = {},
): Promise<PublishedCollections> {
  return {
    blogs: getBlogs("published", options),
    clinics: getClinics("published", options),
    conditions: getConditions("published", options),
    providers: getProviders("published", options),
    serviceUpdates: getServiceUpdates("published", options),
    reviews: getReviews("published", options),
  };
}
