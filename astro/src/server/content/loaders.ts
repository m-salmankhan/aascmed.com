import type {
  AnnouncementSettings, BlogRecord, ClinicRecord, ConditionRecord, ContentPageRecord,
  HomePageRecord, ProviderRecord, ReviewRecord, ServiceUpdateRecord, TrackingSettings,
} from "../../../../src/shared/content/models.ts";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { sortByDateDescending, sortByOrder } from "../../../../src/shared/content/urls.ts";
import { validateContentRecord, type ContentMode } from "../../../../src/shared/content/validation.ts";
import { getAstroServerConfig } from "../config.ts";
import { getByIdentifier, getCollection, getSingle, type StrapiEntity, type StrapiRequestOptions } from "./strapi.ts";
import {
  mapStrapiAnnouncement, mapStrapiBlog, mapStrapiClinic, mapStrapiCondition,
  mapStrapiHomePage, mapStrapiPage, mapStrapiProvider, mapStrapiReview,
  mapStrapiServiceUpdate, mapStrapiTrackingInfo,
} from "./mapping.ts";

function options(mode: ContentMode): StrapiRequestOptions { return { mode }; }
function mediaBaseUrl(mode: ContentMode): string | undefined {
  const base = mode === "draft" ? getAstroServerConfig().draftApiUrl : getAstroServerConfig().strapiApiUrl;
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

export async function getBlogs(mode: ContentMode): Promise<BlogRecord[]> {
  const entities = await getCollection("blog", options(mode));
  return check(entities.map((entity) => mapStrapiBlog(entity, mediaBaseUrl(mode))), "blog", mode);
}
export async function getClinics(mode: ContentMode): Promise<ClinicRecord[]> {
  const entities = await getCollection("clinic", options(mode));
  return check(entities.map(mapStrapiClinic), "clinic", mode);
}
export async function getConditions(mode: ContentMode): Promise<ConditionRecord[]> {
  const entities = await getCollection("condition", options(mode));
  return check(sortByOrder(entities.map((entity) => mapStrapiCondition(entity, mediaBaseUrl(mode)))), "condition", mode);
}
export async function getProviders(mode: ContentMode): Promise<ProviderRecord[]> {
  const entities = await getCollection("provider", options(mode));
  return check(sortByOrder(entities.map((entity) => mapStrapiProvider(entity, mediaBaseUrl(mode)))), "provider", mode);
}
export async function getServiceUpdates(mode: ContentMode): Promise<ServiceUpdateRecord[]> {
  const entities = await getCollection("service-update", options(mode));
  return check(sortByDateDescending(entities.map(mapStrapiServiceUpdate)), "serviceUpdate", mode);
}
export async function getReviews(mode: ContentMode): Promise<ReviewRecord[]> {
  return (await getCollection("review", options(mode))).map(mapStrapiReview);
}

async function byIdentifier<T extends BlogRecord | ConditionRecord | ProviderRecord | ClinicRecord | ServiceUpdateRecord>(
  kind: "blog" | "condition" | "provider" | "clinic" | "service-update", field: "slug" | "documentId", identifier: string,
  family: "blog" | "condition" | "provider" | "clinic" | "serviceUpdate", mode: ContentMode,
  map: (entity: StrapiEntity) => T,
): Promise<T | null> {
  const entity = await getByIdentifier(kind, field, identifier, options(mode));
  if (!entity) return null;
  const record = map(entity);
  const issues = validateContentRecord(record, family, mode);
  if (issues.length) throw new Error(`Published ${family} record failed validation: ${issues.join(", ")}`);
  return record;
}
export const getBlogBySlug = (slug: string, mode: ContentMode): Promise<BlogRecord | null> => byIdentifier("blog", "slug", slug, "blog", mode, (entity) => mapStrapiBlog(entity, mediaBaseUrl(mode)));
export const getConditionBySlug = (slug: string, mode: ContentMode): Promise<ConditionRecord | null> => byIdentifier("condition", "slug", slug, "condition", mode, (entity) => mapStrapiCondition(entity, mediaBaseUrl(mode)));
export const getProviderBySlug = (slug: string, mode: ContentMode): Promise<ProviderRecord | null> => byIdentifier("provider", "slug", slug, "provider", mode, (entity) => mapStrapiProvider(entity, mediaBaseUrl(mode)));
export const getClinicBySlug = (slug: string, mode: ContentMode): Promise<ClinicRecord | null> => byIdentifier("clinic", "slug", slug, "clinic", mode, mapStrapiClinic);
export const getServiceUpdateBySlug = (slug: string, mode: ContentMode): Promise<ServiceUpdateRecord | null> => byIdentifier("service-update", "slug", slug, "serviceUpdate", mode, mapStrapiServiceUpdate);

async function single<T>(kind: Parameters<typeof getSingle>[0], mode: ContentMode, map: (entity: StrapiEntity) => T): Promise<T | null> {
  const entity = await getSingle(kind, options(mode));
  return entity ? map(entity) : null;
}
export const getAnnouncement = (mode: ContentMode): Promise<AnnouncementSettings | null> => single("announcement", mode, mapStrapiAnnouncement);
export const getBlogArchive = (mode: ContentMode): Promise<ContentPageRecord | null> => single("blog-archive", mode, mapStrapiPage);
export const getConditionsArchive = (mode: ContentMode): Promise<ContentPageRecord | null> => single("conditions-archive", mode, mapStrapiPage);
export const getClinicsArchive = (mode: ContentMode): Promise<ContentPageRecord | null> => single("clinics-archive", mode, mapStrapiPage);
export const getContact = (mode: ContentMode): Promise<ContentPageRecord | null> => single("contact", mode, mapStrapiPage);
export const getProvidersPage = (mode: ContentMode): Promise<ContentPageRecord | null> => single("providers-page", mode, mapStrapiPage);
export const getServiceUpdatePage = (mode: ContentMode): Promise<ContentPageRecord | null> => single("service-update-page", mode, mapStrapiPage);
export const getPrivacyPolicy = (mode: ContentMode): Promise<ContentPageRecord | null> => single("privacy-policy", mode, mapStrapiPage);
export const getHomePage = (mode: ContentMode): Promise<HomePageRecord | null> => single("home-page", mode, (entity) => mapStrapiHomePage(entity, mediaBaseUrl(mode)));
export const getTrackingInfo = (mode: ContentMode): Promise<TrackingSettings | null> => single("tracking-info", mode, mapStrapiTrackingInfo);

export interface PublishedContentSnapshot {
  blogs: BlogRecord[];
  clinics: ClinicRecord[];
  conditions: ConditionRecord[];
  providers: ProviderRecord[];
  serviceUpdates: ServiceUpdateRecord[];
  reviews: ReviewRecord[];
}

async function loadPublishedBuildSnapshot(): Promise<PublishedContentSnapshot> {
  const [blogs, clinics, conditions, providers] = await Promise.all([
    getBlogs("published"), getClinics("published"), getConditions("published"), getProviders("published"),
  ]);
  const serviceUpdates = await getServiceUpdates("published");
  const reviews = await getReviews("published");
  return { blogs, clinics, conditions, providers, serviceUpdates, reviews };
}

let staticBuildSnapshot: Promise<PublishedContentSnapshot> | undefined;
const buildSnapshotPath = () => path.resolve(process.cwd(), ".astro", "published-content-snapshot.json");

function isPublishedSnapshot(value: unknown): value is PublishedContentSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Record<string, unknown>;
  return ["blogs", "clinics", "conditions", "providers", "serviceUpdates", "reviews"]
    .every((key) => Array.isArray(snapshot[key]));
}

async function readPublishedSnapshotFile(): Promise<PublishedContentSnapshot | null> {
  const filePath = buildSnapshotPath();
  let serialized: string;
  try { serialized = await readFile(filePath, "utf8"); }
  catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw new Error("Could not read the private published content snapshot");
  }
  let value: unknown;
  try { value = JSON.parse(serialized); }
  catch { throw new Error("The private published content snapshot is malformed"); }
  if (!isPublishedSnapshot(value)) throw new Error("The private published content snapshot has an invalid shape");
  return value;
}

async function writePublishedSnapshotFile(snapshot: PublishedContentSnapshot): Promise<void> {
  const filePath = buildSnapshotPath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(snapshot)}\n`, { flag: "wx" });
  await rename(temporaryPath, filePath);
}

function memoizedSnapshot(work: Promise<PublishedContentSnapshot>): Promise<PublishedContentSnapshot> {
  staticBuildSnapshot = work.catch((error) => {
    staticBuildSnapshot = undefined;
    throw error;
  });
  return staticBuildSnapshot;
}

/**
 * Static builds refresh a private disk snapshot in the Node build hook so
 * Astro's separate Vite prerender context can reuse it without another CMS
 * collection crawl. Draft/SSR reads never read or write this file.
 */
export async function getPublishedBuildSnapshot(options: { staticBuild?: boolean } = {}): Promise<PublishedContentSnapshot> {
  const isStaticBuild = options.staticBuild ?? import.meta.env?.PUBLIC_ASTRO_TARGET === "static";
  if (!isStaticBuild) return loadPublishedBuildSnapshot();
  if (options.staticBuild === true) {
    return memoizedSnapshot(loadPublishedBuildSnapshot().then(async (snapshot) => {
      await writePublishedSnapshotFile(snapshot);
      return snapshot;
    }));
  }
  if (!staticBuildSnapshot) {
    staticBuildSnapshot = (async () => {
      const existing = await readPublishedSnapshotFile();
      if (existing) return existing;
      const snapshot = await loadPublishedBuildSnapshot();
      await writePublishedSnapshotFile(snapshot);
      return snapshot;
    })().catch((error) => {
      staticBuildSnapshot = undefined;
      throw error;
    });
  }
  return staticBuildSnapshot;
}

/** Route collections used by static enumeration; always published. */
export async function getPublishedRouteCollections() {
  const { blogs, clinics, conditions, providers, serviceUpdates } = await getPublishedBuildSnapshot();
  return { blogs, clinics, conditions, providers, serviceUpdates };
}

/** Backward-compatible alias for static build consumers needing all six collections. */
export const getPublishedCollections = getPublishedBuildSnapshot;

