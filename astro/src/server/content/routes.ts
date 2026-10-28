import { blogPath, clinicPath, conditionPath, providerPath, serviceUpdatePath } from "../../../../src/shared/content/urls.ts";
import { getPublishedRouteCollections } from "./loaders.ts";
import type { StrapiRequestScope } from "./strapi.ts";

export type PublishedRouteKind = "blog" | "condition" | "provider" | "clinic" | "service-update";
export interface PublishedRouteManifestEntry { pathname: string; kind: PublishedRouteKind }

/** Published-only detail routes for static path generation and sitemaps. */
export async function getPublishedRouteManifest(scope?: StrapiRequestScope): Promise<PublishedRouteManifestEntry[]> {
  const content = await getPublishedRouteCollections(scope);
  const routes: PublishedRouteManifestEntry[] = [];
  for (const item of content.blogs) { const pathname = blogPath(item.slug); if (pathname) routes.push({ pathname, kind: "blog" }); }
  for (const item of content.conditions) { const pathname = conditionPath(item.slug); if (pathname) routes.push({ pathname, kind: "condition" }); }
  for (const item of content.providers) { const pathname = providerPath(item.slug); if (pathname) routes.push({ pathname, kind: "provider" }); }
  for (const item of content.clinics) { const pathname = clinicPath(item); if (pathname) routes.push({ pathname, kind: "clinic" }); }
  for (const item of content.serviceUpdates) { const pathname = serviceUpdatePath(item); if (pathname) routes.push({ pathname, kind: "service-update" }); }
  if (new Set(routes.map(route => route.pathname)).size !== routes.length) throw new Error("Published content contains duplicate routes");
  return routes;
}
