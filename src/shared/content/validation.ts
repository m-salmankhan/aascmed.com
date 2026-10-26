import type { ContentRecord, ServiceUpdateRecord } from "./models.ts";
import {
  blogPath,
  clinicPath,
  conditionPath,
  providerPath,
  serviceUpdatePath,
} from "./urls.ts";

export type ContentFamily = "blog" | "condition" | "provider" | "clinic" | "serviceUpdate";
/** Validation strictness: drafts may be incomplete, while published records must be routable. */
export type ContentMode = "draft" | "published";

/** Minimal common record fields; clinics may also provide a nullable `clinicName` fallback. */
type Candidate = Partial<ContentRecord> & { clinicName?: string | null };

/** Validate draft or published fields at the content boundary.
 * @param record Partial shared content fields and an optional clinic-name fallback.
 * @param family Content family whose route rules apply.
 * @param mode Drafts are permissive; published records require a nonblank ID/title and valid route.
 * @returns Human-readable issue strings; draft input currently returns an empty list.
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
