// Loads CMS content into shared view records and returns published collections for builds.
import type {
  AnnouncementSettings,
  BlogRecord,
  ClinicRecord,
  ConditionRecord,
  ContentPageRecord,
  HomePageRecord,
  ProviderRecord,
  ReviewRecord,
  ServiceUpdateRecord,
  TrackingSettings,
} from "../../../../src/shared/content/models.ts";
import { sortByDateDescending, sortByOrder } from "../../../../src/shared/content/urls.ts";
import {
  validateContentRecord,
  type ContentFamily,
  type ContentMode,
} from "../../../../src/shared/content/validation.ts";
import { getAstroServerConfig } from "../config.ts";
import {
  getByIdentifier,
  getCollection,
  getSingle,
  type StrapiEntity,
  type StrapiDetailKind,
  type StrapiIdentifierField,
  type StrapiSingleKind,
} from "./strapi.ts";
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
/** Shared records that require a valid public detail route. */
type RoutedContentRecord =
  | BlogRecord
  | ConditionRecord
  | ProviderRecord
  | ClinicRecord
  | ServiceUpdateRecord;
/** Function that converts one raw CMS record into the shared view record returned by a loader. */
type StrapiRecordMapper<TRecord> = (entity: StrapiEntity) => TRecord;
/** Find the CMS origin used to resolve relative media URLs.
 * @returns The configured origin, or undefined when missing or invalid.
 */
function mediaBaseUrl(): string | undefined {
  const base = getAstroServerConfig().strapiApiUrl;
  try {
    return base ? new URL(base).origin : undefined;
  } catch {
    return undefined;
  }
}
/** Validate route-bearing content before it reaches a public build.
 * @param records Normalized records to validate.
 * @param family Route family used to validate each record URL.
 * @param mode Published records are validated strictly; drafts may be incomplete.
 * @returns The original records; throws when a published record is invalid.
 */
function check<T extends RoutedContentRecord>(
  records: T[],
  family: ContentFamily,
  mode: ContentMode,
): T[] {
  if (mode === "draft") {
    return records;
  }
  for (const record of records) {
    const issues = validateContentRecord(record, family, mode);
    if (issues.length) {
      throw new Error(`Published ${family} record failed validation: ${issues.join(", ")}`);
    }
  }
  return records;
}
/** Load and normalize blogs in CMS date order.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getBlogs(mode: ContentMode): Promise<BlogRecord[]> {
  const entities = await getCollection("blog", { mode });
  return check(
    entities.map((entity) => mapStrapiBlog(entity, mediaBaseUrl())),
    "blog",
    mode,
  );
}
/** Load and normalize clinics.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getClinics(mode: ContentMode): Promise<ClinicRecord[]> {
  const entities = await getCollection("clinic", { mode });
  return check(entities.map(mapStrapiClinic), "clinic", mode);
}
/** Load and normalize conditions ordered for display.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getConditions(mode: ContentMode): Promise<ConditionRecord[]> {
  const entities = await getCollection("condition", { mode });
  return check(
    sortByOrder(entities.map((entity) => mapStrapiCondition(entity, mediaBaseUrl()))),
    "condition",
    mode,
  );
}
/** Load and normalize providers ordered for display.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getProviders(mode: ContentMode): Promise<ProviderRecord[]> {
  const entities = await getCollection("provider", { mode });
  return check(
    sortByOrder(entities.map((entity) => mapStrapiProvider(entity, mediaBaseUrl()))),
    "provider",
    mode,
  );
}
/** Load and normalize service updates ordered newest first.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getServiceUpdates(mode: ContentMode): Promise<ServiceUpdateRecord[]> {
  const entities = await getCollection("service-update", { mode });
  return check(sortByDateDescending(entities.map(mapStrapiServiceUpdate)), "serviceUpdate", mode);
}
/** Load and normalize patient reviews.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The matching review records; upstream failures throw.
 */
export async function getReviews(mode: ContentMode): Promise<ReviewRecord[]> {
  return (await getCollection("review", { mode })).map(mapStrapiReview);
}
/** Load and normalize one detail record.
 * @param kind Strapi collection that owns the record.
 * @param field Whether the identifier is a slug or document ID.
 * @param identifier Requested slug or stable document ID.
 * @param family Route family used for published validation.
 * @param mode Published or saved draft content; draft reads require a draft-enabled deployment.
 * @param map Mapper from a Strapi entity to the shared record.
 * @returns The normalized record, or null if no matching document exists; upstream failures throw.
 */
async function byIdentifier<T extends RoutedContentRecord>(
  kind: StrapiDetailKind,
  field: StrapiIdentifierField,
  identifier: string,
  family: ContentFamily,
  mode: ContentMode,
  map: StrapiRecordMapper<T>,
): Promise<T | null> {
  const entity = await getByIdentifier(kind, field, identifier, { mode });
  if (!entity) {
    return null;
  }
  const record = map(entity);
  const issues = validateContentRecord(record, family, mode);
  if (issues.length) {
    throw new Error(`Published ${family} record failed validation: ${issues.join(", ")}`);
  }
  return record;
}
/** Find one blog by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized blog, or null if missing; upstream failures throw.
 */
export const getBlogBySlug = (slug: string, mode: ContentMode): Promise<BlogRecord | null> => {
  return byIdentifier("blog", "slug", slug, "blog", mode, (entity) =>
    mapStrapiBlog(entity, mediaBaseUrl()),
  );
};
/** Find one condition by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized condition, or null if missing; upstream failures throw.
 */
export const getConditionBySlug = (
  slug: string,
  mode: ContentMode,
): Promise<ConditionRecord | null> => {
  return byIdentifier("condition", "slug", slug, "condition", mode, (entity) =>
    mapStrapiCondition(entity, mediaBaseUrl()),
  );
};
/** Find one provider by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized provider, or null if missing; upstream failures throw.
 */
export const getProviderBySlug = (
  slug: string,
  mode: ContentMode,
): Promise<ProviderRecord | null> => {
  return byIdentifier("provider", "slug", slug, "provider", mode, (entity) =>
    mapStrapiProvider(entity, mediaBaseUrl()),
  );
};
/** Find one clinic by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized clinic, or null if missing; upstream failures throw.
 */
export const getClinicBySlug = (slug: string, mode: ContentMode): Promise<ClinicRecord | null> => {
  return byIdentifier("clinic", "slug", slug, "clinic", mode, mapStrapiClinic);
};
/** Find one service update by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized service update, or null if missing; upstream failures throw.
 */
export const getServiceUpdateBySlug = (
  slug: string,
  mode: ContentMode,
): Promise<ServiceUpdateRecord | null> => {
  return byIdentifier(
    "service-update",
    "slug",
    slug,
    "serviceUpdate",
    mode,
    mapStrapiServiceUpdate,
  );
};
/** Load and normalize one single-instance CMS type.
 * @param kind Single type to request.
 * @param mode Published or saved draft content; draft reads require a draft-enabled deployment.
 * @param map Mapper from a Strapi entity to the shared value.
 * @returns The mapped value, or null when no document exists; upstream failures throw.
 */
async function single<T>(
  kind: StrapiSingleKind,
  mode: ContentMode,
  map: StrapiRecordMapper<T>,
): Promise<T | null> {
  const entity = await getSingle(kind, { mode });
  return entity ? map(entity) : null;
}
/** Load the announcement single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized announcement, or null if missing; upstream failures throw.
 */
export const getAnnouncement = (mode: ContentMode): Promise<AnnouncementSettings | null> => {
  return single("announcement", mode, mapStrapiAnnouncement);
};
/** Load the blog archive single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized blog archive, or null if missing; upstream failures throw.
 */
export const getBlogArchive = (mode: ContentMode): Promise<ContentPageRecord | null> => {
  return single("blog-archive", mode, mapStrapiPage);
};
/** Load the conditions archive single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized conditions archive, or null if missing; upstream failures throw.
 */
export const getConditionsArchive = (mode: ContentMode): Promise<ContentPageRecord | null> => {
  return single("conditions-archive", mode, mapStrapiPage);
};
/** Load the clinics archive single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized clinics archive, or null if missing; upstream failures throw.
 */
export const getClinicsArchive = (mode: ContentMode): Promise<ContentPageRecord | null> => {
  return single("clinics-archive", mode, mapStrapiPage);
};
/** Load the contact page single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized contact page, or null if missing; upstream failures throw.
 */
export const getContact = (mode: ContentMode): Promise<ContentPageRecord | null> => {
  return single("contact", mode, mapStrapiPage);
};
/** Load the providers page single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized providers page, or null if missing; upstream failures throw.
 */
export const getProvidersPage = (mode: ContentMode): Promise<ContentPageRecord | null> => {
  return single("providers-page", mode, mapStrapiPage);
};
/** Load the service updates page single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized service updates page, or null if missing; upstream failures throw.
 */
export const getServiceUpdatePage = (mode: ContentMode): Promise<ContentPageRecord | null> => {
  return single("service-update-page", mode, mapStrapiPage);
};
/** Load the privacy policy single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized privacy policy, or null if missing; upstream failures throw.
 */
export const getPrivacyPolicy = (mode: ContentMode): Promise<ContentPageRecord | null> => {
  return single("privacy-policy", mode, mapStrapiPage);
};
/** Load the homepage single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized homepage, or null if missing; upstream failures throw.
 */
export const getHomePage = (mode: ContentMode): Promise<HomePageRecord | null> => {
  return single("home-page", mode, (entity) => mapStrapiHomePage(entity, mediaBaseUrl()));
};
/** Load the tracking settings single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @returns The normalized tracking settings, or null if missing; upstream failures throw.
 */
export const getTrackingInfo = (mode: ContentMode): Promise<TrackingSettings | null> => {
  return single("tracking-info", mode, mapStrapiTrackingInfo);
};
export interface PublishedCollections {
  blogs: BlogRecord[];
  clinics: ClinicRecord[];
  conditions: ConditionRecord[];
  providers: ProviderRecord[];
  serviceUpdates: ServiceUpdateRecord[];
  reviews: ReviewRecord[];
}
/** Fetch the six published content collections for a static build or server request.
 * @returns Normalized published records; fetch and validation failures throw.
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
/** Select the published collections used to enumerate public detail routes.
 * @returns Published blogs, clinics, conditions, providers, and service updates.
 */
export async function getPublishedRouteCollections() {
  const { blogs, clinics, conditions, providers, serviceUpdates } = await getPublishedCollections();
  return { blogs, clinics, conditions, providers, serviceUpdates };
}
