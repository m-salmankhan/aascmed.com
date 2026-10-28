import type {
  AnnouncementSettings, BlogRecord, ClinicRecord, ConditionRecord, ContentPageRecord,
  HomePageRecord, ProviderRecord, ReviewRecord, ServiceUpdateRecord, TrackingSettings,
} from "../../../../src/shared/content/models.ts";
import { sortByDateDescending, sortByOrder } from "../../../../src/shared/content/urls.ts";
import { validateContentRecord, type ContentMode } from "../../../../src/shared/content/validation.ts";
import { getAstroServerConfig } from "../config.ts";
import { readBuildSnapshotBridge } from "./build-snapshot-bridge.ts";
import { createStrapiRequestScope, getByIdentifier, getCollection, getSingle, type StrapiEntity, type StrapiRequestOptions, type StrapiRequestScope } from "./strapi.ts";
import {
  mapStrapiAnnouncement, mapStrapiBlog, mapStrapiClinic, mapStrapiCondition,
  mapStrapiHomePage, mapStrapiPage, mapStrapiProvider, mapStrapiReview,
  mapStrapiServiceUpdate, mapStrapiTrackingInfo,
} from "./mapping.ts";

function options(mode: ContentMode, scope?: StrapiRequestScope): StrapiRequestOptions { return { mode, scope }; }
function mediaBaseUrl(): string | undefined {
  const base = getAstroServerConfig().strapiApiUrl;
  try { return base ? new URL(base).origin : undefined; } catch { return undefined; }
}
function check<T extends BlogRecord | ConditionRecord | ProviderRecord | ClinicRecord | ServiceUpdateRecord>(records: T[], family: "blog" | "condition" | "provider" | "clinic" | "serviceUpdate", mode: ContentMode): T[] {
  if (mode === "draft") return records;
  for (const record of records) {
    const issues = validateContentRecord(record, family, mode);
    if (issues.length) throw new Error(`Published ${family} record failed validation: ${issues.join(", ")}`);
  }
  return records;
}

export async function getBlogs(mode: ContentMode, scope?: StrapiRequestScope): Promise<BlogRecord[]> {
  const entities = await getCollection("blog", options(mode, scope));
  return check(entities.map((entity) => mapStrapiBlog(entity, mediaBaseUrl())), "blog", mode);
}
export async function getClinics(mode: ContentMode, scope?: StrapiRequestScope): Promise<ClinicRecord[]> {
  const entities = await getCollection("clinic", options(mode, scope));
  return check(entities.map(mapStrapiClinic), "clinic", mode);
}
export async function getConditions(mode: ContentMode, scope?: StrapiRequestScope): Promise<ConditionRecord[]> {
  const entities = await getCollection("condition", options(mode, scope));
  return check(sortByOrder(entities.map((entity) => mapStrapiCondition(entity, mediaBaseUrl()))), "condition", mode);
}
export async function getProviders(mode: ContentMode, scope?: StrapiRequestScope): Promise<ProviderRecord[]> {
  const entities = await getCollection("provider", options(mode, scope));
  return check(sortByOrder(entities.map((entity) => mapStrapiProvider(entity, mediaBaseUrl()))), "provider", mode);
}
export async function getServiceUpdates(mode: ContentMode, scope?: StrapiRequestScope): Promise<ServiceUpdateRecord[]> {
  const entities = await getCollection("service-update", options(mode, scope));
  return check(sortByDateDescending(entities.map(mapStrapiServiceUpdate)), "serviceUpdate", mode);
}
export async function getReviews(mode: ContentMode, scope?: StrapiRequestScope): Promise<ReviewRecord[]> {
  return (await getCollection("review", options(mode, scope))).map(mapStrapiReview);
}

async function byIdentifier<T extends BlogRecord | ConditionRecord | ProviderRecord | ClinicRecord | ServiceUpdateRecord>(
  kind: "blog" | "condition" | "provider" | "clinic" | "service-update", field: "slug" | "documentId", identifier: string,
  family: "blog" | "condition" | "provider" | "clinic" | "serviceUpdate", mode: ContentMode,
  map: (entity: StrapiEntity) => T, scope?: StrapiRequestScope,
): Promise<T | null> {
  const entity = await getByIdentifier(kind, field, identifier, options(mode, scope));
  if (!entity) return null;
  const record = map(entity);
  const issues = validateContentRecord(record, family, mode);
  if (issues.length) throw new Error(`Published ${family} record failed validation: ${issues.join(", ")}`);
  return record;
}
export const getBlogBySlug = (slug: string, mode: ContentMode, scope?: StrapiRequestScope): Promise<BlogRecord | null> => byIdentifier("blog", "slug", slug, "blog", mode, (entity) => mapStrapiBlog(entity, mediaBaseUrl()), scope);
export const getConditionBySlug = (slug: string, mode: ContentMode, scope?: StrapiRequestScope): Promise<ConditionRecord | null> => byIdentifier("condition", "slug", slug, "condition", mode, (entity) => mapStrapiCondition(entity, mediaBaseUrl()), scope);
export const getProviderBySlug = (slug: string, mode: ContentMode, scope?: StrapiRequestScope): Promise<ProviderRecord | null> => byIdentifier("provider", "slug", slug, "provider", mode, (entity) => mapStrapiProvider(entity, mediaBaseUrl()), scope);
export const getClinicBySlug = (slug: string, mode: ContentMode, scope?: StrapiRequestScope): Promise<ClinicRecord | null> => byIdentifier("clinic", "slug", slug, "clinic", mode, mapStrapiClinic, scope);
export const getServiceUpdateBySlug = (slug: string, mode: ContentMode, scope?: StrapiRequestScope): Promise<ServiceUpdateRecord | null> => byIdentifier("service-update", "slug", slug, "serviceUpdate", mode, mapStrapiServiceUpdate, scope);

async function single<T>(kind: Parameters<typeof getSingle>[0], mode: ContentMode, map: (entity: StrapiEntity) => T, scope?: StrapiRequestScope): Promise<T | null> {
  const entity = await getSingle(kind, options(mode, scope));
  return entity ? map(entity) : null;
}
export const getAnnouncement = (mode: ContentMode, scope?: StrapiRequestScope): Promise<AnnouncementSettings | null> => single("announcement", mode, mapStrapiAnnouncement, scope);
export const getBlogArchive = (mode: ContentMode, scope?: StrapiRequestScope): Promise<ContentPageRecord | null> => single("blog-archive", mode, mapStrapiPage, scope);
export const getConditionsArchive = (mode: ContentMode, scope?: StrapiRequestScope): Promise<ContentPageRecord | null> => single("conditions-archive", mode, mapStrapiPage, scope);
export const getClinicsArchive = (mode: ContentMode, scope?: StrapiRequestScope): Promise<ContentPageRecord | null> => single("clinics-archive", mode, mapStrapiPage, scope);
export const getContact = (mode: ContentMode, scope?: StrapiRequestScope): Promise<ContentPageRecord | null> => single("contact", mode, mapStrapiPage, scope);
export const getProvidersPage = (mode: ContentMode, scope?: StrapiRequestScope): Promise<ContentPageRecord | null> => single("providers-page", mode, mapStrapiPage, scope);
export const getServiceUpdatePage = (mode: ContentMode, scope?: StrapiRequestScope): Promise<ContentPageRecord | null> => single("service-update-page", mode, mapStrapiPage, scope);
export const getPrivacyPolicy = (mode: ContentMode, scope?: StrapiRequestScope): Promise<ContentPageRecord | null> => single("privacy-policy", mode, mapStrapiPage, scope);
export const getHomePage = (mode: ContentMode, scope?: StrapiRequestScope): Promise<HomePageRecord | null> => single("home-page", mode, (entity) => mapStrapiHomePage(entity, mediaBaseUrl()), scope);
export const getTrackingInfo = (mode: ContentMode, scope?: StrapiRequestScope): Promise<TrackingSettings | null> => single("tracking-info", mode, mapStrapiTrackingInfo, scope);

export interface PublishedContentSnapshot {
  blogs: BlogRecord[];
  clinics: ClinicRecord[];
  conditions: ConditionRecord[];
  providers: ProviderRecord[];
  serviceUpdates: ServiceUpdateRecord[];
  reviews: ReviewRecord[];
}

async function loadPublishedBuildSnapshot(scope: StrapiRequestScope): Promise<PublishedContentSnapshot> {
  const [blogs, clinics, conditions, providers] = await Promise.all([
    getBlogs("published", scope), getClinics("published", scope), getConditions("published", scope), getProviders("published", scope),
  ]);
  const serviceUpdates = await getServiceUpdates("published", scope);
  const reviews = await getReviews("published", scope);
  return { blogs, clinics, conditions, providers, serviceUpdates, reviews };
}

const buildSnapshots = new WeakMap<StrapiRequestScope, Promise<PublishedContentSnapshot>>();
let staticPrerenderSnapshot: Promise<PublishedContentSnapshot> | undefined;

/** A caller-owned scope shares one published snapshot for one build only. */
export async function getPublishedBuildSnapshot(options: { scope?: StrapiRequestScope } = {}): Promise<PublishedContentSnapshot> {
  if (options.scope) {
    let snapshot = buildSnapshots.get(options.scope);
    if (!snapshot) {
      snapshot = loadPublishedBuildSnapshot(options.scope).catch(error => { buildSnapshots.delete(options.scope!); throw error; });
      buildSnapshots.set(options.scope, snapshot);
    }
    return snapshot;
  }

  if (import.meta.env?.PUBLIC_ASTRO_TARGET === "static" && getAstroServerConfig().contentMode === "published") {
    if (!staticPrerenderSnapshot) {
      staticPrerenderSnapshot = (async () =>
        (await readBuildSnapshotBridge()) ?? loadPublishedBuildSnapshot(createStrapiRequestScope())
      )().catch((error) => { staticPrerenderSnapshot = undefined; throw error; });
    }
    return staticPrerenderSnapshot;
  }
  return loadPublishedBuildSnapshot(createStrapiRequestScope());
}

/** Route collections used by static enumeration; always published. */
export async function getPublishedRouteCollections(scope?: StrapiRequestScope) {
  const { blogs, clinics, conditions, providers, serviceUpdates } = await getPublishedBuildSnapshot({ scope });
  return { blogs, clinics, conditions, providers, serviceUpdates };
}

/** Alias for build consumers needing all six collections. */
export const getPublishedCollections = getPublishedBuildSnapshot;
