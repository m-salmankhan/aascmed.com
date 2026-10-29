// Creates Strapi SDK clients and validates their content API responses.
import {
  HTTPError,
  HTTPNotFoundError,
  strapi,
  type API,
  type CollectionTypeManager,
  type SingleTypeManager,
} from "@strapi/client";
import type { ContentMode as ValidationContentMode } from "../../../../src/shared/content/validation.ts";
/** Publication state requested from Strapi; draft reads require a draft-enabled deployment. */
export type ContentMode = ValidationContentMode;
/** Flattened Strapi record after its stable document ID has been checked. */
export interface StrapiEntity {
  documentId: string;
  [field: string]: unknown;
}
/** Sanitized failure categories reported by the content adapter. */
export type StrapiRequestFailureKind = "configuration" | "upstream" | "invalid-response";
/** Failure returned to callers without leaking URLs, credentials, or response content. */
export class StrapiRequestError extends Error {
  readonly kind: StrapiRequestFailureKind;
  readonly status?: number;
  /** Describe a safe content request failure.
   * @param kind Failure category.
   * @param message Safe explanation without credentials or upstream content.
   * @param status Optional HTTP status from Strapi.
   * @returns The sanitized request error.
   */
  constructor(kind: StrapiRequestFailureKind, message: string, status?: number) {
    super(message);
    this.name = "StrapiRequestError";
    this.kind = kind;
    this.status = status;
  }
}
const DEFAULT_PAGE_SIZE = 100;
const MAX_PAGE_SIZE = 100;
// Protect against a broken upstream that never terminates pagination, not a CMS display limit.
const MAX_PAGES = 10000;
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
/** Create an authenticated official SDK client after enforcing deployment publication rules.
 * @param mode Published or saved draft content requested by the caller.
 * @returns SDK client configured for the one server-side Strapi instance.
 */
export function createClient(mode: ContentMode) {
  if (
    mode === "draft" &&
    (process.env.ASTRO_CONTENT_MODE !== "draft" ||
      import.meta.env?.PUBLIC_ASTRO_TARGET === "static")
  ) {
    throw new StrapiRequestError(
      "configuration",
      "Draft content is unavailable in this deployment",
    );
  }
  if (mode !== "draft" && mode !== "published") {
    throw new StrapiRequestError("configuration", "Invalid content mode");
  }
  const headers: Record<string, string> = { Accept: "application/json" };
  if (mode === "draft") {
    headers["Cache-Control"] = "no-store";
  }
  const endpoint = safeEndpoint(process.env.GATSBY_STRAPI_API_URL);
  try {
    return strapi({
      baseURL: endpoint.href.replace(/\/$/, ""),
      ...(process.env.STRAPI_TOKEN ? { auth: process.env.STRAPI_TOKEN } : {}),
      headers,
    });
  } catch {
    throw new StrapiRequestError("configuration", "Strapi client configuration is invalid");
  }
}
/** Convert SDK and JSON failures into safe project errors.
 * @param error Thrown SDK, network, or parsing error.
 * @returns Sanitized error category, message, and optional HTTP status.
 */
function requestFailure(error: unknown): StrapiRequestError {
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
    return new StrapiRequestError("invalid-response", "Strapi returned malformed JSON");
  }
  return new StrapiRequestError(
    "upstream",
    error instanceof Error && error.name === "AbortError"
      ? "Strapi request timed out"
      : "Strapi request could not be completed",
  );
}
/** Cancel an SDK error body that will not be returned or parsed by the content adapter.
 * @param error Error thrown for a non-OK SDK response.
 * @returns Promise<void> after any unread body has been cancelled.
 */
async function cancelErrorBody(error: unknown): Promise<void> {
  if (error instanceof HTTPError) {
    await error.response.body?.cancel().catch(() => undefined);
  }
}
/** Check a Strapi record before exposing it to mapping functions.
 * @param value Untrusted record from an SDK response.
 * @returns The flattened record with a nonempty document ID; throws for malformed content.
 */
function validateEntity(value: unknown): StrapiEntity {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new StrapiRequestError("invalid-response", "Strapi returned an invalid content record");
  }
  const entity = value as Record<string, unknown>;
  if (typeof entity.documentId !== "string" || !entity.documentId.trim()) {
    throw new StrapiRequestError("invalid-response", "Strapi content record is missing documentId");
  }
  return entity as StrapiEntity;
}
/** Yield records from an SDK collection one bounded page at a time.
 * @param manager Official Strapi SDK manager for a specific collection resource.
 * @param query Publication status, sort, filters, and population for this collection.
 * @param pageSize Requested batch size, from 1 through the Strapi maximum of 100.
 * @returns Validated records in server order; later pages are fetched only when requested.
 */
export async function* readRecords(
  manager: CollectionTypeManager,
  query: API.BaseQueryParams,
  pageSize = DEFAULT_PAGE_SIZE,
): AsyncGenerator<StrapiEntity> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new StrapiRequestError(
      "configuration",
      `Strapi page size must be between 1 and ${MAX_PAGE_SIZE}`,
    );
  }
  let totalRead = 0;
  for (let page = 1; page <= MAX_PAGES; page++) {
    let response: API.DocumentResponseCollection;
    try {
      response = await manager.find({
        ...query,
        pagination: {
          ...query.pagination,
          page,
          pageSize,
          withCount: true,
        },
      });
    } catch (error) {
      await cancelErrorBody(error);
      throw requestFailure(error);
    }
    if (!response || !Array.isArray(response.data)) {
      throw new StrapiRequestError("invalid-response", "Strapi returned an invalid collection");
    }
    const pageCount = response.meta?.pagination?.pageCount;
    const total = response.meta?.pagination?.total;
    if (
      (typeof pageCount === "number" && pageCount > MAX_PAGES) ||
      (typeof total === "number" && total > MAX_PAGE_SIZE * MAX_PAGES)
    ) {
      throw new StrapiRequestError(
        "upstream",
        `Strapi collection exceeds the ${MAX_PAGE_SIZE * MAX_PAGES} record safety limit`,
      );
    }
    totalRead += response.data.length;
    if (totalRead > MAX_PAGE_SIZE * MAX_PAGES) {
      throw new StrapiRequestError(
        "upstream",
        `Strapi collection exceeds the ${MAX_PAGE_SIZE * MAX_PAGES} record safety limit`,
      );
    }
    for (const value of response.data) {
      yield validateEntity(value);
    }
    if (typeof pageCount === "number" ? page >= pageCount : response.data.length < pageSize) {
      break;
    }
    if (page === MAX_PAGES) {
      throw new StrapiRequestError(
        "upstream",
        `Strapi collection may exceed the ${MAX_PAGE_SIZE * MAX_PAGES} record safety limit`,
      );
    }
  }
}
/** Read the first matching record from a filtered SDK collection query.
 * @param manager Official Strapi SDK manager for the requested collection.
 * @param query Status, filter, population, and pagination parameters for the lookup.
 * @returns The matching validated record or null when no row matches.
 */
export async function readFirst(
  manager: CollectionTypeManager,
  query: API.BaseQueryParams,
): Promise<StrapiEntity | null> {
  let response: API.DocumentResponseCollection;
  try {
    response = await manager.find(query);
  } catch (error) {
    await cancelErrorBody(error);
    throw requestFailure(error);
  }
  if (!response || !Array.isArray(response.data)) {
    throw new StrapiRequestError("invalid-response", "Strapi returned an invalid lookup");
  }
  return response.data.length ? validateEntity(response.data[0]) : null;
}
/** Read one SDK single type, returning null for missing content or an HTTP 404.
 * @param manager Official Strapi SDK manager for the requested single type.
 * @param query Publication state and population parameters for the single type.
 * @returns The validated record or null when Strapi reports no document.
 */
export async function readSingle(
  manager: SingleTypeManager,
  query: API.BaseQueryParams,
): Promise<StrapiEntity | null> {
  let response: API.DocumentResponse;
  try {
    response = await manager.find(query);
  } catch (error) {
    await cancelErrorBody(error);
    if (error instanceof HTTPNotFoundError) {
      return null;
    }
    throw requestFailure(error);
  }
  if (!response || !Object.hasOwn(response, "data")) {
    throw new StrapiRequestError("invalid-response", "Strapi returned an invalid single type");
  }
  return response.data == null ? null : validateEntity(response.data);
}
