// Loads CMS content into shared view records and shares published snapshots within a build.
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
  createStrapiRequestScope,
  getByIdentifier,
  getCollection,
  getSingle,
  type StrapiEntity,
  type StrapiRequestOptions,
  type StrapiRequestScope,
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
/** Optional build-owned scope for sharing the published snapshot. */
export type PublishedSnapshotOptions = {
  scope?: StrapiRequestScope;
};
/** Prepare REST options for a content read.
 * @param mode Published content or saved draft content, subject to the deployment guard.
 * @param scope Optional request-local deduplication scope.
 * @returns Options for the Strapi adapter.
 */
function options(mode: ContentMode, scope?: StrapiRequestScope): StrapiRequestOptions {
  return { mode, scope };
}
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
 * @param scope Optional request-local deduplication scope.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getBlogs(
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<BlogRecord[]> {
  const entities = await getCollection("blog", options(mode, scope));
  return check(
    entities.map((entity) => mapStrapiBlog(entity, mediaBaseUrl())),
    "blog",
    mode,
  );
}
/** Load and normalize clinics.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getClinics(
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ClinicRecord[]> {
  const entities = await getCollection("clinic", options(mode, scope));
  return check(entities.map(mapStrapiClinic), "clinic", mode);
}
/** Load and normalize conditions ordered for display.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getConditions(
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ConditionRecord[]> {
  const entities = await getCollection("condition", options(mode, scope));
  return check(
    sortByOrder(entities.map((entity) => mapStrapiCondition(entity, mediaBaseUrl()))),
    "condition",
    mode,
  );
}
/** Load and normalize providers ordered for display.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getProviders(
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ProviderRecord[]> {
  const entities = await getCollection("provider", options(mode, scope));
  return check(
    sortByOrder(entities.map((entity) => mapStrapiProvider(entity, mediaBaseUrl()))),
    "provider",
    mode,
  );
}
/** Load and normalize service updates ordered newest first.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The matching records; invalid published route records or upstream failures throw.
 */
export async function getServiceUpdates(
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ServiceUpdateRecord[]> {
  const entities = await getCollection("service-update", options(mode, scope));
  return check(sortByDateDescending(entities.map(mapStrapiServiceUpdate)), "serviceUpdate", mode);
}
/** Load and normalize patient reviews.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The matching review records; upstream failures throw.
 */
export async function getReviews(
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ReviewRecord[]> {
  return (await getCollection("review", options(mode, scope))).map(mapStrapiReview);
}
/** Load and normalize one detail record.
 * @param kind Strapi collection that owns the record.
 * @param field Whether the identifier is a slug or document ID.
 * @param identifier Requested slug or stable document ID.
 * @param family Route family used for published validation.
 * @param mode Published or saved draft content; draft reads require a draft-enabled deployment.
 * @param map Mapper from a Strapi entity to the shared record.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized record, or null if no matching document exists; upstream failures throw.
 */
async function byIdentifier<T extends RoutedContentRecord>(
  kind: StrapiDetailKind,
  field: StrapiIdentifierField,
  identifier: string,
  family: ContentFamily,
  mode: ContentMode,
  map: StrapiRecordMapper<T>,
  scope?: StrapiRequestScope,
): Promise<T | null> {
  const entity = await getByIdentifier(kind, field, identifier, options(mode, scope));
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
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized blog, or null if missing; upstream failures throw.
 */
export const getBlogBySlug = (
  slug: string,
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<BlogRecord | null> => {
  return byIdentifier(
    "blog",
    "slug",
    slug,
    "blog",
    mode,
    (entity) => mapStrapiBlog(entity, mediaBaseUrl()),
    scope,
  );
};
/** Find one condition by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized condition, or null if missing; upstream failures throw.
 */
export const getConditionBySlug = (
  slug: string,
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ConditionRecord | null> => {
  return byIdentifier(
    "condition",
    "slug",
    slug,
    "condition",
    mode,
    (entity) => mapStrapiCondition(entity, mediaBaseUrl()),
    scope,
  );
};
/** Find one provider by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized provider, or null if missing; upstream failures throw.
 */
export const getProviderBySlug = (
  slug: string,
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ProviderRecord | null> => {
  return byIdentifier(
    "provider",
    "slug",
    slug,
    "provider",
    mode,
    (entity) => mapStrapiProvider(entity, mediaBaseUrl()),
    scope,
  );
};
/** Find one clinic by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized clinic, or null if missing; upstream failures throw.
 */
export const getClinicBySlug = (
  slug: string,
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ClinicRecord | null> => {
  return byIdentifier("clinic", "slug", slug, "clinic", mode, mapStrapiClinic, scope);
};
/** Find one service update by its route slug.
 * @param slug Requested route slug.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized service update, or null if missing; upstream failures throw.
 */
export const getServiceUpdateBySlug = (
  slug: string,
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ServiceUpdateRecord | null> => {
  return byIdentifier(
    "service-update",
    "slug",
    slug,
    "serviceUpdate",
    mode,
    mapStrapiServiceUpdate,
    scope,
  );
};
/** Load and normalize one single-instance CMS type.
 * @param kind Single type to request.
 * @param mode Published or saved draft content; draft reads require a draft-enabled deployment.
 * @param map Mapper from a Strapi entity to the shared value.
 * @param scope Optional request-local deduplication scope.
 * @returns The mapped value, or null when no document exists; upstream failures throw.
 */
async function single<T>(
  kind: StrapiSingleKind,
  mode: ContentMode,
  map: StrapiRecordMapper<T>,
  scope?: StrapiRequestScope,
): Promise<T | null> {
  const entity = await getSingle(kind, options(mode, scope));
  return entity ? map(entity) : null;
}
/** Load the announcement single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized announcement, or null if missing; upstream failures throw.
 */
export const getAnnouncement = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<AnnouncementSettings | null> => {
  return single("announcement", mode, mapStrapiAnnouncement, scope);
};
/** Load the blog archive single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized blog archive, or null if missing; upstream failures throw.
 */
export const getBlogArchive = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ContentPageRecord | null> => {
  return single("blog-archive", mode, mapStrapiPage, scope);
};
/** Load the conditions archive single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized conditions archive, or null if missing; upstream failures throw.
 */
export const getConditionsArchive = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ContentPageRecord | null> => {
  return single("conditions-archive", mode, mapStrapiPage, scope);
};
/** Load the clinics archive single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized clinics archive, or null if missing; upstream failures throw.
 */
export const getClinicsArchive = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ContentPageRecord | null> => {
  return single("clinics-archive", mode, mapStrapiPage, scope);
};
/** Load the contact page single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized contact page, or null if missing; upstream failures throw.
 */
export const getContact = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ContentPageRecord | null> => {
  return single("contact", mode, mapStrapiPage, scope);
};
/** Load the providers page single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized providers page, or null if missing; upstream failures throw.
 */
export const getProvidersPage = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ContentPageRecord | null> => {
  return single("providers-page", mode, mapStrapiPage, scope);
};
/** Load the service updates page single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized service updates page, or null if missing; upstream failures throw.
 */
export const getServiceUpdatePage = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ContentPageRecord | null> => {
  return single("service-update-page", mode, mapStrapiPage, scope);
};
/** Load the privacy policy single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized privacy policy, or null if missing; upstream failures throw.
 */
export const getPrivacyPolicy = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<ContentPageRecord | null> => {
  return single("privacy-policy", mode, mapStrapiPage, scope);
};
/** Load the homepage single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized homepage, or null if missing; upstream failures throw.
 */
export const getHomePage = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<HomePageRecord | null> => {
  return single("home-page", mode, (entity) => mapStrapiHomePage(entity, mediaBaseUrl()), scope);
};
/** Load the tracking settings single type.
 * @param mode Published content or saved drafts; draft reads require a draft-enabled deployment.
 * @param scope Optional request-local deduplication scope.
 * @returns The normalized tracking settings, or null if missing; upstream failures throw.
 */
export const getTrackingInfo = (
  mode: ContentMode,
  scope?: StrapiRequestScope,
): Promise<TrackingSettings | null> => {
  return single("tracking-info", mode, mapStrapiTrackingInfo, scope);
};
export interface PublishedContentSnapshot {
  blogs: BlogRecord[];
  clinics: ClinicRecord[];
  conditions: ConditionRecord[];
  providers: ProviderRecord[];
  serviceUpdates: ServiceUpdateRecord[];
  reviews: ReviewRecord[];
}
/** Fetch all six published collections for a build.
 * @param scope Build-local scope shared across the collection requests.
 * @returns A complete published collection snapshot.
 */
async function loadPublishedBuildSnapshot(
  scope: StrapiRequestScope,
): Promise<PublishedContentSnapshot> {
  const [blogs, clinics, conditions, providers] = await Promise.all([
    getBlogs("published", scope),
    getClinics("published", scope),
    getConditions("published", scope),
    getProviders("published", scope),
  ]);
  const serviceUpdates = await getServiceUpdates("published", scope);
  const reviews = await getReviews("published", scope);
  return { blogs, clinics, conditions, providers, serviceUpdates, reviews };
}
const buildSnapshots = new WeakMap<StrapiRequestScope, Promise<PublishedContentSnapshot>>();
/** Load a published collection snapshot and optionally reuse it within one build.
 * @param options Optional caller-owned build scope; omit it for a fresh snapshot.
 * @returns The six published collections; failed reads are not retained in the scope.
 */
export async function getPublishedBuildSnapshot(
  options: PublishedSnapshotOptions = {},
): Promise<PublishedContentSnapshot> {
  if (!options.scope) {
    return loadPublishedBuildSnapshot(createStrapiRequestScope());
  }
  let snapshot = buildSnapshots.get(options.scope);
  if (!snapshot) {
    snapshot = loadPublishedBuildSnapshot(options.scope).catch((error) => {
      buildSnapshots.delete(options.scope!);
      throw error;
    });
    buildSnapshots.set(options.scope, snapshot);
  }
  return snapshot;
}
/** Select the collections used to enumerate public detail routes.
 * @param scope Optional build scope for reusing a published snapshot.
 * @returns Published blogs, clinics, conditions, providers, and service updates.
 */
export async function getPublishedRouteCollections(scope?: StrapiRequestScope) {
  const { blogs, clinics, conditions, providers, serviceUpdates } = await getPublishedBuildSnapshot(
    { scope },
  );
  return { blogs, clinics, conditions, providers, serviceUpdates };
}
/** Load or reuse a published build snapshot through the collection-oriented name.
 * @param options Optional caller-owned build scope.
 * @returns The six published collections.
 */
export const getPublishedCollections = getPublishedBuildSnapshot;
