import type { ContentRecord, ServiceUpdateRecord } from "./models.ts";
import {
  blogPath,
  clinicPath,
  conditionPath,
  providerPath,
  serviceUpdatePath,
} from "./urls.ts";

export type ContentFamily = "blog" | "condition" | "provider" | "clinic" | "serviceUpdate";
export type ContentMode = "draft" | "published";

type Candidate = Partial<ContentRecord> & { clinicName?: string | null };

/**
 * Draft previews may omit required publishing fields while an editor is working.
 * Published records must have an identity, a useful title, and a routable URL.
 * Optional body/content/media fields are deliberately not required in either mode.
 */
export function validateContentRecord(
  record: Candidate,
  family: ContentFamily,
  mode: ContentMode,
): string[] {
  if (mode === "draft") return [];

  const issues: string[] = [];
  if (typeof record.id !== "string" || !record.id.trim()) issues.push("id is required");
  if (typeof record.title !== "string" || !record.title.trim()) issues.push("title is required");

  let path: string | null;
  switch (family) {
    case "blog": path = blogPath(record.slug); break;
    case "condition": path = conditionPath(record.slug); break;
    case "provider": path = providerPath(record.slug); break;
    case "clinic": path = clinicPath({ slug: record.slug ?? null, clinicName: record.clinicName ?? null }); break;
    case "serviceUpdate":
      path = serviceUpdatePath(record as Pick<ServiceUpdateRecord, "slug" | "date">);
      break;
  }
  if (!path) issues.push("a valid URL for this content record is required");
  return issues;
}
