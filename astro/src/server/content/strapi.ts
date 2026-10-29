// Uses the official Strapi SDK for REST queries, publication guards, and collection pagination.
import { HTTPError, HTTPNotFoundError, strapi, type API } from "@strapi/client";
import type { paths as StrapiOpenApiPaths } from "./generated/types";
import { clinicPath } from "../../../../src/shared/content/urls.ts";
import { getAstroServerConfig } from "../config.ts";
import type { JsonValue } from "../../../../src/shared/content/models.ts";
import type { ContentMode as ValidationContentMode } from "../../../../src/shared/content/validation.ts";
/** Publication state requested from Strapi. Draft reads require a draft-enabled server deployment. */
export type ContentMode = ValidationContentMode;
/** Collection types exposed by the CMS. */
export type StrapiCollectionKind =
  | "blog"
  | "clinic"
  | "condition"
  | "provider"
  | "service-update"
  | "review";
/** Collection types that have detail routes. */
export type StrapiDetailKind = Exclude<StrapiCollectionKind, "review">;
/** Single-instance types exposed by the CMS. */
export type StrapiSingleKind =
  | "announcement"
  | "blog-archive"
  | "conditions-archive"
  | "clinics-archive"
  | "contact"
  | "providers-page"
  | "service-update-page"
  | "privacy-policy"
  | "home-page"
  | "tracking-info";
/** Any content type supported by the REST adapter. */
export type StrapiKind = StrapiCollectionKind | StrapiSingleKind;
/** The stable document identity or route slug used for a detail lookup. */
export type StrapiIdentifierField = "slug" | "documentId";
/** Raw CMS record after its documentId has been checked.
 * Other fields remain unknown until the mapping functions inspect their values.
 */
export interface StrapiEntity {
  documentId: string;
  [field: string]: unknown;
}
/** Sanitized failure categories reported by the content adapter. */
export type StrapiRequestFailureKind = "configuration" | "upstream" | "invalid-response";
export class StrapiRequestError extends Error {
  readonly kind: StrapiRequestFailureKind;
  readonly status?: number;
  /** Describe a sanitized content request failure.
   * @param kind Failure category.
   * @param message Safe explanation without credentials or upstream content.
   * @param status Optional HTTP status from Strapi.
   */
  constructor(kind: StrapiRequestFailureKind, message: string, status?: number) {
    super(message);
    this.name = "StrapiRequestError";
    this.kind = kind;
    this.status = status;
  }
}
export interface StrapiRequestOptions {
  /** Published content or saved drafts; drafts require a draft-enabled server. */
  mode: ContentMode;
}
const PAGE_SIZE = 100;
// Defend against a broken upstream that never terminates pagination, not a CMS display limit.
const MAX_PAGES = 10000;
/** URL paths declared by the generated OpenAPI specification. */
type StrapiApiPath = keyof StrapiOpenApiPaths;
/** REST endpoint for each supported content type; TypeScript checks these paths against OpenAPI. */
const CONTENT_PATH: Record<StrapiKind, StrapiApiPath> = {
  blog: "/blogs",
  clinic: "/clinics",
  condition: "/conditions",
  provider: "/providers",
  "service-update": "/service-updates",
  review: "/reviews",
  announcement: "/announcement",
  "blog-archive": "/blog-archive",
  "conditions-archive": "/conditions-archive",
  "clinics-archive": "/clinics-archive",
  contact: "/contact",
  "providers-page": "/providers-page",
  "service-update-page": "/service-update-page",
  "privacy-policy": "/privacy-policy",
  "home-page": "/home-page",
  "tracking-info": "/tracking-info",
};
const sectionWithMedia = { populate: { media: true } };
const dynamicContent = {
  on: {
    "generic.contact-booking-cta": { populate: "*" },
    "generic.faq-contact-book-buttons": { populate: "*" },
    "generic.rich-text": { populate: "*" },
    "generic.faq": { populate: { questions: true } },
  },
};
/** Nested population fields requested for one CMS content type. */
type StrapiPopulation = Record<string, unknown>;
/** Population query definitions indexed by supported CMS type. */
type StrapiPopulationByKind = Record<StrapiKind, StrapiPopulation>;
/** REST population options use Strapi's qs-style nested URL parameters; `populate=*` does not fetch deep relations. */
export const POPULATE: StrapiPopulationByKind = {
  blog: {
    thumbnail: true,
    content: {
      on: {
        "generic.contact-booking-cta": { populate: "*" },
        "clinics.map": { populate: "*" },
        "generic.rich-text": { populate: "*" },
      },
    },
  },
  clinic: {
    location: true,
    contact: true,
    hours: { populate: { opening_hours: true, shot_hours: true } },
  },
  condition: { thumbnail: true, content: dynamicContent },
  provider: {
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
  },
  "service-update": {},
  review: {},
  announcement: {},
  "blog-archive": {},
  "conditions-archive": {},
  "clinics-archive": {},
  contact: {},
  "providers-page": {},
  "service-update-page": {},
  "privacy-policy": {},
  "home-page": {
    hero: sectionWithMedia,
    genericBelowHero: sectionWithMedia,
    conditions: sectionWithMedia,
    serviceUpdates: sectionWithMedia,
    blog: sectionWithMedia,
    providers: sectionWithMedia,
    feedback: true,
    locations: sectionWithMedia,
    contact: sectionWithMedia,
  },
  "tracking-info": {},
};
/** Validate the configured CMS origin and locate its REST API root.
 * @param base Configured Strapi origin, optionally including an API path.
 * @returns An HTTPS or localhost HTTP API URL; throws for unsupported configuration.
 */
function safeEndpoint(base: string | undefined): URL {
  if (!base) {
    throw new StrapiRequestError("configuration", "Strapi API URL is not configured");
  }
  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new StrapiRequestError("configuration", "Strapi API URL is invalid");
  }
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
  ) {
    throw new StrapiRequestError("configuration", "Strapi API URL must use HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new StrapiRequestError("configuration", "Strapi API URL contains unsupported URL parts");
  }
  const path = url.pathname.replace(/\/$/, "");
  if (!path.endsWith("/api")) {
    url.pathname = `${path}/api/`;
  }
  return url;
}
/** Check whether a decoded response value is a JSON object.
 * @param value Untrusted value returned by the CMS.
 * @returns True when properties can be inspected safely.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** Validate one flattened Strapi 5 record returned by the SDK.
 * @param value Raw record from the SDK response.
 * @param kind Content type used in safe error messages.
 * @returns The record with a nonempty stable document ID; throws for malformed data.
 */
function validateEntity(value: unknown, kind: StrapiKind): StrapiEntity {
  if (!isObject(value)) {
    throw new StrapiRequestError("invalid-response", `Strapi returned an invalid ${kind} record`);
  }
  const documentId = value.documentId;
  if (typeof documentId !== "string" || !documentId.trim()) {
    throw new StrapiRequestError("invalid-response", `Strapi ${kind} record is missing documentId`);
  }
  return value as StrapiEntity;
}
/** Validate publication access and create an authenticated official SDK client.
 * The SDK enforces its built-in 10-second request timeout; its public API does not expose per-request signals.
 * @param mode Published or draft status requested for this operation.
 * @returns SDK client configured for the single server-side Strapi instance.
 */
function createClient(mode: ContentMode) {
  const config = getAstroServerConfig();
  if (
    mode === "draft" &&
    (config.contentMode !== "draft" || import.meta.env?.PUBLIC_ASTRO_TARGET === "static")
  ) {
    throw new StrapiRequestError(
      "configuration",
      "Draft content is unavailable in this deployment",
    );
  }
  if (mode !== "draft" && mode !== "published") {
    throw new StrapiRequestError("configuration", "Invalid content mode");
  }
  const endpoint = safeEndpoint(config.strapiApiUrl);
  const headers = {
    Accept: "application/json",
    "Cache-Control": "no-store",
  };
  try {
    return strapi({
      baseURL: endpoint.href.replace(/\/$/, ""),
      ...(config.strapiToken ? { auth: config.strapiToken } : {}),
      headers,
    });
  } catch {
    throw new StrapiRequestError("configuration", "Strapi client configuration is invalid");
  }
}
/** Convert SDK, network, and JSON failures to messages that never include URLs or response bodies.
 * @param error Thrown value from the SDK request.
 * @param kind CMS content type being loaded.
 * @returns Sanitized error category, message, and optional HTTP status.
 */
function sanitizeRequestError(error: unknown, kind: StrapiKind): StrapiRequestError {
  if (error instanceof StrapiRequestError) {
    return error;
  }
  if (error instanceof HTTPError) {
    return new StrapiRequestError(
      "upstream",
      `Strapi request failed (${error.response.status})`,
      error.response.status,
    );
  }
  if (error instanceof SyntaxError) {
    return new StrapiRequestError("invalid-response", `Strapi returned malformed ${kind} JSON`);
  }
  return new StrapiRequestError(
    "upstream",
    error instanceof Error && error.name === "AbortError"
      ? "Strapi request timed out"
      : "Strapi request could not be completed",
  );
}
/** Run one SDK operation and surface only sanitized failures.
 * @param kind CMS content type being requested.
 * @param operation SDK operation that returns a Strapi response envelope.
 * @returns The parsed SDK response; configuration and upstream failures throw safe errors.
 */
async function requestFromSdk<T>(
  kind: StrapiKind,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof HTTPError) {
      await error.response.body?.cancel().catch(() => undefined);
    }
    throw sanitizeRequestError(error, kind);
  }
}
/** Build SDK query parameters with explicit publication state and the requested page.
 * @param kind Collection type being queried.
 * @param mode Published or draft content state.
 * @param page One-based page number.
 * @returns Parameters consumed and serialized by the official SDK.
 */
function collectionQuery(
  kind: StrapiCollectionKind,
  mode: ContentMode,
  page: number,
): API.BaseQueryParams {
  return {
    status: mode,
    populate: POPULATE[kind],
    sort:
      kind === "blog" || kind === "service-update"
        ? ["date:desc", "documentId:asc"]
        : kind === "provider" || kind === "condition"
          ? ["order:asc", "documentId:asc"]
          : ["documentId:asc"],
    pagination: { page, pageSize: PAGE_SIZE, withCount: true },
  };
}
/** Fetch every page of a collection using the official SDK query builder.
 * @param kind Collection to enumerate.
 * @param options Published or draft mode.
 * @returns Validated records; malformed or excessive responses throw sanitized errors.
 */
export async function getCollection(
  kind: StrapiCollectionKind,
  options: StrapiRequestOptions,
): Promise<StrapiEntity[]> {
  const client = createClient(options.mode);
  const manager = client.collection(kind, { path: CONTENT_PATH[kind] });
  const all: StrapiEntity[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await requestFromSdk(kind, () =>
      manager.find(collectionQuery(kind, options.mode, page)),
    );
    if (!response || !Array.isArray(response.data)) {
      throw new StrapiRequestError(
        "invalid-response",
        `Strapi returned an invalid ${kind} collection`,
      );
    }
    const pagination = response.meta?.pagination;
    const pageCount = pagination?.pageCount;
    const total = pagination?.total;
    if (
      (typeof pageCount === "number" && pageCount > MAX_PAGES) ||
      (typeof total === "number" && total > PAGE_SIZE * MAX_PAGES)
    ) {
      throw new StrapiRequestError(
        "upstream",
        `Strapi ${kind} collection exceeds the ${PAGE_SIZE * MAX_PAGES} record safety limit`,
      );
    }
    all.push(...response.data.map((entity) => validateEntity(entity, kind)));
    if (typeof pageCount === "number" ? page >= pageCount : response.data.length < PAGE_SIZE) {
      break;
    }
    if (page === MAX_PAGES) {
      throw new StrapiRequestError(
        "upstream",
        `Strapi ${kind} collection may exceed the ${PAGE_SIZE * MAX_PAGES} record safety limit`,
      );
    }
  }
  return all;
}
/** Look up one record by its route slug or stable document ID.
 * @param kind Detail collection to query.
 * @param field Identifier field used for the lookup.
 * @param identifier Requested slug or document ID.
 * @param options Published or draft mode.
 * @returns The entity or null if no record matches; upstream failures throw sanitized errors.
 */
export async function getByIdentifier(
  kind: StrapiDetailKind,
  field: StrapiIdentifierField,
  identifier: string,
  options: StrapiRequestOptions,
): Promise<StrapiEntity | null> {
  if (!identifier.trim()) {
    return null;
  }
  const client = createClient(options.mode);
  const manager = client.collection(kind, { path: CONTENT_PATH[kind] });
  const response = await requestFromSdk(kind, () =>
    manager.find({
      status: options.mode,
      filters: { [field]: { $eq: identifier } },
      populate: POPULATE[kind],
      pagination: { page: 1, pageSize: 1 },
    }),
  );
  if (!Array.isArray(response?.data)) {
    throw new StrapiRequestError("invalid-response", `Strapi returned an invalid ${kind} lookup`);
  }
  if (response.data.length) {
    return validateEntity(response.data[0], kind);
  }
  if (kind === "clinic" && field === "slug") {
    // Name-derived URLs cannot be reversed: both spaces and existing hyphens become '-'.
    // Match using the same route helper that publishes the clinic URL instead.
    const clinics = await getCollection("clinic", options);
    const fallback = clinics.find((clinic) => {
      if (clinic.slug || typeof clinic.clinic_name !== "string") {
        return false;
      }
      return (
        clinicPath({ slug: null, clinicName: clinic.clinic_name }) === `/clinics/${identifier}/`
      );
    });
    return fallback ? validateEntity(fallback, kind) : null;
  }
  return null;
}
/** Fetch one Strapi single type using the official SDK.
 * @param kind Single type to request.
 * @param options Published or draft mode.
 * @returns The entity or null when Strapi returns no data or a not-found status.
 */
export async function getSingle(
  kind: StrapiSingleKind,
  options: StrapiRequestOptions,
): Promise<StrapiEntity | null> {
  const client = createClient(options.mode);
  const manager = client.single(kind, { path: CONTENT_PATH[kind] });
  let response: API.DocumentResponse;
  try {
    response = await manager.find({
      status: options.mode,
      populate: POPULATE[kind],
    });
  } catch (error) {
    if (error instanceof HTTPNotFoundError) {
      await error.response.body?.cancel().catch(() => undefined);
      return null;
    }
    if (error instanceof HTTPError) {
      await error.response.body?.cancel().catch(() => undefined);
    }
    throw sanitizeRequestError(error, kind);
  }
  if (!response || !Object.hasOwn(response, "data")) {
    throw new StrapiRequestError(
      "invalid-response",
      `Strapi returned an invalid ${kind} singleton`,
    );
  }
  if (response.data == null) {
    return null;
  }
  return validateEntity(response.data, kind);
}
/** Normalize CMS data to JSON-safe values while removing Strapi bookkeeping fields.
 * @param value Raw scalar, array, or object from a CMS response.
 * @returns Serializable content, or undefined for unsupported values.
 */
export function jsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    const output = value.map(jsonValue);
    return output.every((item) => item !== undefined) ? (output as JsonValue[]) : undefined;
  }
  if (value && typeof value === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (
        key === "id" ||
        key === "createdAt" ||
        key === "updatedAt" ||
        key === "publishedAt" ||
        key === "documentId"
      ) {
        continue;
      }
      const normalized = jsonValue(child);
      if (normalized !== undefined) {
        output[key] = normalized;
      }
    }
    return output;
  }
  return undefined;
}
