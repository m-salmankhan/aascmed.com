// Builds the published detail-route inventory from normalized content records.
import {
  blogPath,
  clinicPath,
  conditionPath,
  providerPath,
  serviceUpdatePath,
} from "../../../../src/shared/content/urls.ts";
import { getPublishedCollections } from "./loaders.ts";
export type PublishedRouteKind = "blog" | "condition" | "provider" | "clinic" | "service-update";
export interface PublishedRouteManifestEntry {
  pathname: string;
  kind: PublishedRouteKind;
}
/** Enumerate valid public detail paths from the published collections.
 * @returns Route paths and families; duplicate paths or upstream failures throw.
 */
export async function getPublishedRouteManifest(): Promise<PublishedRouteManifestEntry[]> {
  const content = await getPublishedCollections();
  const routes: PublishedRouteManifestEntry[] = [];
  for await (const item of content.blogs) {
    const pathname = blogPath(item.slug);
    if (pathname) {
      routes.push({ pathname, kind: "blog" });
    }
  }
  for await (const item of content.conditions) {
    const pathname = conditionPath(item.slug);
    if (pathname) {
      routes.push({ pathname, kind: "condition" });
    }
  }
  for await (const item of content.providers) {
    const pathname = providerPath(item.slug);
    if (pathname) {
      routes.push({ pathname, kind: "provider" });
    }
  }
  for await (const item of content.clinics) {
    const pathname = clinicPath(item);
    if (pathname) {
      routes.push({ pathname, kind: "clinic" });
    }
  }
  for await (const item of content.serviceUpdates) {
    const pathname = serviceUpdatePath(item);
    if (pathname) {
      routes.push({ pathname, kind: "service-update" });
    }
  }
  if (new Set(routes.map((route) => route.pathname)).size !== routes.length) {
    throw new Error("Published content contains duplicate routes");
  }
  return routes;
}
