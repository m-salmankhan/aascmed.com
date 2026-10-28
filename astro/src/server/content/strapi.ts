import { getAstroServerConfig } from "../config.ts";
import type { JsonValue } from "../../../../src/shared/content/models.ts";

export type ContentMode = "published" | "draft";
export type StrapiKind = "blog" | "clinic" | "condition" | "provider" | "service-update" | "review"
  | "announcement" | "blog-archive" | "conditions-archive" | "clinics-archive" | "contact"
  | "providers-page" | "service-update-page" | "privacy-policy" | "home-page" | "tracking-info";

export interface StrapiEntity {
  id?: number | string;
  documentId: string;
  [field: string]: unknown;
}

export class StrapiRequestError extends Error {
  readonly kind: "configuration" | "upstream" | "invalid-response";
  readonly status?: number;
  constructor(kind: StrapiRequestError["kind"], message: string, status?: number) {
    super(message);
    this.name = "StrapiRequestError";
    this.kind = kind;
    this.status = status;
  }
}

export interface StrapiRequestOptions {
  mode: ContentMode;
  fetcher?: typeof fetch;
  timeoutMs?: number;
  scope?: StrapiRequestScope;
}

/** A request/build-local deduplication scope; never share it between preview requests. */
export interface StrapiRequestScope { inflight: Map<string, Promise<unknown>> }
export function createStrapiRequestScope(): StrapiRequestScope { return { inflight: new Map() }; }

const PAGE_SIZE = 100;
// Defend against a broken upstream that never terminates pagination, not a CMS display limit.
const MAX_PAGES = 10_000;
const DEFAULT_TIMEOUT_MS = 5000;
let activeRequests = 0;
const waiting: Array<() => void> = [];
async function acquire(): Promise<void> {
  if (activeRequests >= 4) await new Promise<void>(resolve => waiting.push(resolve));
  else activeRequests++;
}
function release(): void {
  const next = waiting.shift();
  if (next) next(); else activeRequests--;
}
const COLLECTION_PATH: Record<Extract<StrapiKind, "blog" | "clinic" | "condition" | "provider" | "service-update" | "review">, string> = {
  blog: "blogs", clinic: "clinics", condition: "conditions", provider: "providers",
  "service-update": "service-updates", review: "reviews",
};

const sectionWithMedia = { populate: { media: true } };
const dynamicContent = { on: {
  "generic.contact-booking-cta": { populate: "*" },
  "generic.faq-contact-book-buttons": { populate: "*" },
  "generic.rich-text": { populate: "*" },
  "generic.faq": { populate: { questions: true } },
} };

/** Explicitly describe nested fields per CMS type; avoid Strapi's unbounded populate=* expansion. */
export const POPULATE: Record<StrapiKind, Record<string, unknown>> = {
  blog: { thumbnail: true, content: { on: { "generic.contact-booking-cta": { populate: "*" }, "clinics.map": { populate: "*" }, "generic.rich-text": { populate: "*" } } } },
  clinic: {
    location: true, contact: true,
    hours: { populate: { opening_hours: true, shot_hours: true } },
  },
  condition: { thumbnail: true, content: dynamicContent },
  provider: {
    image: true, name: true, review: true,
    retirementNotice: true, body: { on: { "generic.rich-text": { populate: "*" }, "generic.contact-booking-cta": { populate: "*" }, "generic.faq-contact-book-buttons": { populate: "*" } } },
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
    hero: sectionWithMedia, genericBelowHero: sectionWithMedia,
    conditions: sectionWithMedia, serviceUpdates: sectionWithMedia, blog: sectionWithMedia,
    providers: sectionWithMedia, feedback: true, locations: sectionWithMedia,
    contact: sectionWithMedia,
  },
  "tracking-info": {},
};

/** Serialize Strapi's nested query syntax without a runtime dependency on `qs`. */
export function serializeQuery(value: Record<string, unknown>): string {
  const pairs: string[] = [];
  const visit = (current: unknown, path: string) => {
    if (current === true) { pairs.push(`${encodeURIComponent(path)}=true`); return; }
    if (current === false || current == null) return;
    if (Array.isArray(current)) {
      current.forEach((child, index) => visit(child, `${path}[${index}]`));
      return;
    }
    if (typeof current === "object") {
      for (const [key, child] of Object.entries(current as Record<string, unknown>)) visit(child, path ? `${path}[${key}]` : key);
      return;
    }
    pairs.push(`${encodeURIComponent(path)}=${encodeURIComponent(String(current))}`);
  };
  for (const [key, child] of Object.entries(value)) visit(child, key);
  return pairs.join("&");
}

function safeEndpoint(base: string | undefined): URL {
  if (!base) throw new StrapiRequestError("configuration", "Strapi API URL is not configured");
  let url: URL;
  try { url = new URL(base); } catch { throw new StrapiRequestError("configuration", "Strapi API URL is invalid"); }
  if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) {
    throw new StrapiRequestError("configuration", "Strapi API URL must use HTTPS");
  }
  if (url.username || url.password || url.search || url.hash) throw new StrapiRequestError("configuration", "Strapi API URL contains unsupported URL parts");
  const path = url.pathname.replace(/\/$/, "");
  if (!path.endsWith("/api")) url.pathname = `${path}/api/`;
  return url;
}

function unwrapData(value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value) && "data" in value) return (value as { data: unknown }).data;
  return value;
}

function validateEntity(value: unknown, kind: StrapiKind): StrapiEntity {
  const entity = unwrapData(value);
  if (!entity || typeof entity !== "object" || Array.isArray(entity)) throw new StrapiRequestError("invalid-response", `Strapi returned an invalid ${kind} record`);
  const candidate = entity as Record<string, unknown>;
  const documentId = candidate.documentId;
  if (typeof documentId !== "string" || !documentId.trim()) throw new StrapiRequestError("invalid-response", `Strapi ${kind} record is missing documentId`);
  return candidate as StrapiEntity;
}

async function requestJson<T>(url: URL, mode: ContentMode, options: StrapiRequestOptions, notFoundIsNull = false): Promise<T> {
  const config = getAstroServerConfig();
  if (mode === "draft" && (config.contentMode !== "draft" || import.meta.env?.PUBLIC_ASTRO_TARGET === "static")) {
    throw new StrapiRequestError("configuration", "Draft content is unavailable in this deployment");
  }
  if (mode !== "draft" && mode !== "published") throw new StrapiRequestError("configuration", "Invalid content mode");
  const inflight = options.scope?.inflight;
  const key = `${mode}:${url.toString()}`;
  const existing = inflight?.get(key) as Promise<T> | undefined;
  if (existing) return existing;

  const work = (async () => {
    await acquire();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const headers = new Headers({ Accept: "application/json", "Cache-Control": "no-store" });
      if (config.strapiToken) headers.set("Authorization", `Bearer ${config.strapiToken}`);
      const response = await (options.fetcher ?? fetch)(url, {
        method: "GET", headers, signal: controller.signal, cache: "no-store", redirect: "error",
      });
      if (response.status === 404 && notFoundIsNull) {
        await response.body?.cancel().catch(() => undefined);
        return null as T;
      }
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        throw new StrapiRequestError("upstream", `Strapi request failed (${response.status})`, response.status);
      }
      try { return await response.json() as T; }
      catch (error) { if (controller.signal.aborted) throw error; throw new StrapiRequestError("invalid-response", "Strapi returned malformed JSON"); }
    } catch (error) {
      if (error instanceof StrapiRequestError) throw error;
      // Never include the URL, headers, token, or upstream body in the surfaced error.
      throw new StrapiRequestError("upstream", error instanceof Error && error.name === "AbortError" ? "Strapi request timed out" : "Strapi request could not be completed");
    } finally {
      clearTimeout(timeout);
      controller.abort();
      release();
    }
  })();
  inflight?.set(key, work);
  try { return await work; } finally { if (inflight?.get(key) === work) inflight.delete(key); }
}

export async function getCollection<T extends StrapiEntity>(
  kind: Extract<StrapiKind, "blog" | "clinic" | "condition" | "provider" | "service-update" | "review">,
  options: StrapiRequestOptions,
): Promise<T[]> {
  const config = getAstroServerConfig();
  const base = config.strapiApiUrl;
  const endpoint = safeEndpoint(base);
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/${COLLECTION_PATH[kind]}`;
  endpoint.search = "";
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL(endpoint);
    url.search = serializeQuery({
      status: options.mode,
      populate: POPULATE[kind],
      sort: kind === "blog" || kind === "service-update" ? ["date:desc", "documentId:asc"] : kind === "provider" || kind === "condition" ? ["order:asc", "documentId:asc"] : ["documentId:asc"],
      pagination: { page, pageSize: PAGE_SIZE, withCount: true },
    });
    const payload = await requestJson<{ data?: unknown; meta?: { pagination?: { pageCount?: number; total?: number } } }>(url, options.mode, options);
    if (!payload) throw new StrapiRequestError("upstream", `Strapi collection request failed (404)`, 404);
    if (!Array.isArray(payload.data)) throw new StrapiRequestError("invalid-response", `Strapi returned an invalid ${kind} collection`);
    const pageCount = payload.meta?.pagination?.pageCount;
    const total = payload.meta?.pagination?.total;
    if ((pageCount !== undefined && pageCount > MAX_PAGES) || (total !== undefined && total > PAGE_SIZE * MAX_PAGES)) {
      throw new StrapiRequestError("upstream", `Strapi ${kind} collection exceeds the ${PAGE_SIZE * MAX_PAGES} record safety limit`);
    }
    all.push(...payload.data.map((entity) => validateEntity(entity, kind) as T));
    if (pageCount !== undefined ? page >= pageCount : payload.data.length < PAGE_SIZE) break;
    if (page === MAX_PAGES) {
      throw new StrapiRequestError("upstream", `Strapi ${kind} collection may exceed the ${PAGE_SIZE * MAX_PAGES} record safety limit`);
    }
  }
  return all;
}

/** Request one route record by a fixed slug/documentId field; draft routes never enumerate drafts. */
export async function getByIdentifier<T extends StrapiEntity>(
  kind: Extract<StrapiKind, "blog" | "clinic" | "condition" | "provider" | "service-update">,
  field: "slug" | "documentId",
  identifier: string,
  options: StrapiRequestOptions,
): Promise<T | null> {
  if (!identifier.trim()) return null;
  const config = getAstroServerConfig();
  const base = config.strapiApiUrl;
  const endpoint = safeEndpoint(base);
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/${COLLECTION_PATH[kind]}`;
  const filters = kind === "clinic" && field === "slug"
    ? { $or: [{ slug: { $eq: identifier } }, { $and: [{ $or: [{ slug: { $null: true } }, { slug: { $eq: "" } }] }, { clinic_name: { $eqi: identifier.replace(/-/g, " ") } }] }] }
    : { [field]: { $eq: identifier } };
  endpoint.search = serializeQuery({
    status: options.mode,
    filters,
    populate: POPULATE[kind],
    pagination: { page: 1, pageSize: 1 },
  });
  const payload = await requestJson<{ data?: unknown }>(endpoint, options.mode, options);
  if (!payload || !Array.isArray(payload.data)) throw new StrapiRequestError("invalid-response", `Strapi returned an invalid ${kind} lookup`);
  return payload.data.length ? validateEntity(payload.data[0], kind) as T : null;
}

export async function getSingle<T extends StrapiEntity>(kind: Exclude<StrapiKind, "blog" | "clinic" | "condition" | "provider" | "service-update" | "review">, options: StrapiRequestOptions): Promise<T | null> {
  const config = getAstroServerConfig();
  const base = config.strapiApiUrl;
  const endpoint = safeEndpoint(base);
  endpoint.pathname = `${endpoint.pathname.replace(/\/$/, "")}/${kind}`;
  endpoint.search = serializeQuery({ status: options.mode, populate: POPULATE[kind] });
  const payload = await requestJson<{ data?: unknown }>(endpoint, options.mode, options, true);
  if (!payload) return null;
  if (!Object.hasOwn(payload, "data")) throw new StrapiRequestError("invalid-response", `Strapi returned an invalid ${kind} singleton`);
  if (payload.data == null) return null;
  return validateEntity(payload.data, kind) as T;
}

export function jsonValue(value: unknown): JsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) {
    const output = value.map(jsonValue);
    return output.every((item) => item !== undefined) ? output as JsonValue[] : undefined;
  }
  if (value && typeof value === "object") {
    const output: Record<string, JsonValue> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "id" || key === "createdAt" || key === "updatedAt" || key === "publishedAt" || key === "documentId") continue;
      const normalized = jsonValue(child);
      if (normalized !== undefined) output[key] = normalized;
    }
    return output;
  }
  return undefined;
}
