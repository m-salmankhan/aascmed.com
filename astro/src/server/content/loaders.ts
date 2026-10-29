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
import { clinicPath, sortByDateDescending, sortByOrder } from "../../../../src/shared/content/urls.ts";
import {
  validateContentRecord,
  type ContentFamily,
  type ContentMode,
} from "../../../../src/shared/content/validation.ts";
import { createClient, readAllPages, readFirst, readSingle } from "./strapi.ts";
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
/** Validate route-bearing records at the published-content boundary.
 * @param records Normalized content records to validate.
 * @param family Route convention used for the records.
 * @param mode Draft records may be incomplete; published records must have public routes.
 * @returns Nothing; throws if a published record is invalid.
 */
function validateRouteRecords(
  records: readonly ContentRecord[],
  family: ContentFamily,
  mode: ContentMode,
): void {
  if (mode === "draft") {
    return;
  }
  for (const record of records) {
    const issues = validateContentRecord(record, family, mode);
    if (issues.length) {
      throw new Error(`Published ${family} record failed validation: ${issues.join(", ")}`);
    }
  }
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
 * @returns Mapped blogs; invalid published routes or upstream failures throw.
 */
export async function getBlogs(mode: ContentMode): Promise<BlogRecord[]> {
  const client = createClient(mode);
  const rawRecords = await readAllPages(client.collection("blogs"), {
    status: mode,
    sort: ["date:desc", "documentId:asc"],
    populate: blogPopulate,
  });
  const mediaOrigin = new URL(client.baseURL).origin;
  const records = rawRecords.map((entity) => mapStrapiBlog(entity, mediaOrigin));
  validateRouteRecords(records, "blog", mode);
  return records;
}
/** Load and normalize clinics with locations, contacts, and hours populated.
 * @param mode Content state requested from Strapi.
 * @returns Mapped clinics; invalid published routes or upstream failures throw.
 */
export async function getClinics(mode: ContentMode): Promise<ClinicRecord[]> {
  const client = createClient(mode);
  const rawRecords = await readAllPages(client.collection("clinics"), {
    status: mode,
    sort: ["documentId:asc"],
    populate: clinicPopulate,
  });
  const records = rawRecords.map(mapStrapiClinic);
  validateRouteRecords(records, "clinic", mode);
  return records;
}
/** Load and normalize conditions in display order with their content blocks populated.
 * @param mode Content state requested from Strapi.
 * @returns Mapped conditions; invalid published routes or upstream failures throw.
 */
export async function getConditions(mode: ContentMode): Promise<ConditionRecord[]> {
  const client = createClient(mode);
  const rawRecords = await readAllPages(client.collection("conditions"), {
    status: mode,
    sort: ["order:asc", "documentId:asc"],
    populate: conditionPopulate,
  });
  const mediaOrigin = new URL(client.baseURL).origin;
  const mappedRecords = rawRecords.map((entity) => mapStrapiCondition(entity, mediaOrigin));
  const records = sortByOrder(mappedRecords);
  validateRouteRecords(records, "condition", mode);
  return records;
}
/** Load and normalize providers in display order with profile blocks populated.
 * @param mode Content state requested from Strapi.
 * @returns Mapped providers; invalid published routes or upstream failures throw.
 */
export async function getProviders(mode: ContentMode): Promise<ProviderRecord[]> {
  const client = createClient(mode);
  const rawRecords = await readAllPages(client.collection("providers"), {
    status: mode,
    sort: ["order:asc", "documentId:asc"],
    populate: providerPopulate,
  });
  const mediaOrigin = new URL(client.baseURL).origin;
  const mappedRecords = rawRecords.map((entity) => mapStrapiProvider(entity, mediaOrigin));
  const records = sortByOrder(mappedRecords);
  validateRouteRecords(records, "provider", mode);
  return records;
}
/** Load and normalize service updates, newest first.
 * @param mode Content state requested from Strapi.
 * @returns Mapped updates; invalid published routes or upstream failures throw.
 */
export async function getServiceUpdates(mode: ContentMode): Promise<ServiceUpdateRecord[]> {
  const client = createClient(mode);
  const rawRecords = await readAllPages(client.collection("service-updates"), {
    status: mode,
    sort: ["date:desc", "documentId:asc"],
  });
  const records = sortByDateDescending(rawRecords.map(mapStrapiServiceUpdate));
  validateRouteRecords(records, "serviceUpdate", mode);
  return records;
}
/** Load and normalize patient reviews.
 * @param mode Content state requested from Strapi.
 * @returns Mapped reviews; upstream failures throw.
 */
export async function getReviews(mode: ContentMode): Promise<ReviewRecord[]> {
  const client = createClient(mode);
  const rawRecords = await readAllPages(client.collection("reviews"), {
    status: mode,
    sort: ["documentId:asc"],
  });
  return rawRecords.map(mapStrapiReview);
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
  validateRouteRecords([record], "blog", mode);
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
  validateRouteRecords([record], "condition", mode);
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
  validateRouteRecords([record], "provider", mode);
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
    validateRouteRecords([record], "clinic", mode);
    return record;
  }
  const rawClinics = await readAllPages(client.collection("clinics"), {
    status: mode,
    sort: ["documentId:asc"],
    populate: clinicPopulate,
  });
  const clinics = rawClinics.map(mapStrapiClinic);
  const fallback = clinics.find(
    (clinic) =>
      !clinic.slug &&
      clinic.clinicName &&
      clinicPath({ slug: null, clinicName: clinic.clinicName }) === `/clinics/${slug}/`,
  );
  if (fallback) {
    validateRouteRecords([fallback], "clinic", mode);
  }
  return fallback ?? null;
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
  validateRouteRecords([record], "serviceUpdate", mode);
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
  blogs: BlogRecord[];
  clinics: ClinicRecord[];
  conditions: ConditionRecord[];
  providers: ProviderRecord[];
  serviceUpdates: ServiceUpdateRecord[];
  reviews: ReviewRecord[];
}
/** Fetch all six published collection resources concurrently.
 * @returns Normalized published records; upstream and validation failures throw.
 */
export async function getPublishedCollections(): Promise<PublishedCollections> {
  const [blogs, clinics, conditions, providers, serviceUpdates, reviews] = await Promise.all([
    getBlogs("published"),
    getClinics("published"),
    getConditions("published"),
    getProviders("published"),
    getServiceUpdates("published"),
    getReviews("published"),
  ]);
  return { blogs, clinics, conditions, providers, serviceUpdates, reviews };
}
/** Select published records that have public detail routes.
 * @returns Published blogs, clinics, conditions, providers, and service updates.
 */
export async function getPublishedRouteCollections() {
  const { blogs, clinics, conditions, providers, serviceUpdates } = await getPublishedCollections();
  return { blogs, clinics, conditions, providers, serviceUpdates };
}
