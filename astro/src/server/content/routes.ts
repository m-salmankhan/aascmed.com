// Reads only published route fields from Strapi for static paths and sitemap metadata.
import {
  blogPath,
  clinicPath,
  conditionPath,
  providerPath,
  serviceUpdatePath,
} from "../../../../src/shared/content/urls.ts";
import { createClient, readRecords } from "./strapi.ts";

export type PublishedRouteKind = "blog" | "condition" | "provider" | "clinic" | "service-update";
export interface PublishedRouteManifestEntry {
  pathname: string;
  kind: PublishedRouteKind;
  /** CMS modification time; absent when the upstream record has none. */
  updatedAt?: string;
}

/** Read an optional CMS text field without accepting non-string values as route data.
 * @param value A scalar field returned by Strapi.
 * @returns The string value, or null when it is missing or has another type.
 */
function textField(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Enumerate published detail paths without fetching rich text, components or media.
 * @returns Small route/date references; invalid routes, duplicates or upstream failures throw.
 * API responses arrive in batches of at most 100 references, independently of full page loaders.
 */
export async function getPublishedRouteManifest(): Promise<PublishedRouteManifestEntry[]> {
  const client = createClient("published");
  const routes: PublishedRouteManifestEntry[] = [];

  /** Append one validated path and its optional CMS edit timestamp.
   * @param pathname Public route produced by the content family's URL rule.
   * @param kind Content family represented by this route.
   * @param updatedAt CMS edit timestamp; non-string values are omitted.
   * @returns Nothing; an invalid published path throws rather than silently disappearing.
   */
  function addRoute(pathname: string | null, kind: PublishedRouteKind, updatedAt: unknown): void {
    if (!pathname) {
      throw new Error(`Published ${kind} record has an invalid route`);
    }
    routes.push({ pathname, kind, updatedAt: textField(updatedAt) ?? undefined });
  }

  for await (const item of readRecords(client.collection("blogs"), {
    status: "published",
    fields: ["slug", "updatedAt"],
    sort: ["documentId:asc"],
  })) {
    addRoute(blogPath(textField(item.slug)), "blog", item.updatedAt);
  }
  for await (const item of readRecords(client.collection("conditions"), {
    status: "published",
    fields: ["slug", "updatedAt"],
    sort: ["documentId:asc"],
  })) {
    addRoute(conditionPath(textField(item.slug)), "condition", item.updatedAt);
  }
  for await (const item of readRecords(client.collection("providers"), {
    status: "published",
    fields: ["slug", "updatedAt"],
    sort: ["documentId:asc"],
  })) {
    addRoute(providerPath(textField(item.slug)), "provider", item.updatedAt);
  }
  for await (const item of readRecords(client.collection("clinics"), {
    status: "published",
    fields: ["slug", "clinic_name", "updatedAt"],
    sort: ["documentId:asc"],
  })) {
    const clinic = { slug: textField(item.slug), clinicName: textField(item.clinic_name) };
    addRoute(clinicPath(clinic), "clinic", item.updatedAt);
  }
  for await (const item of readRecords(client.collection("service-updates"), {
    status: "published",
    fields: ["slug", "date", "updatedAt"],
    sort: ["documentId:asc"],
  })) {
    const update = { slug: textField(item.slug), date: textField(item.date) };
    addRoute(serviceUpdatePath(update), "service-update", item.updatedAt);
  }

  if (new Set(routes.map((route) => route.pathname)).size !== routes.length) {
    throw new Error("Published content contains duplicate routes");
  }
  return routes;
}
