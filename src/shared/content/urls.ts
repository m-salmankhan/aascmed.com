import type { ClinicRecord, ServiceUpdateRecord } from "./models";

/** Build a safe trailing-slash route, or return null for an absent or unsafe slug. */
function pathFor(family: string, slug: string | null | undefined): string | null {
  const segment = slug?.replace(/^\/+|\/+$/g, "");
  if (!segment || segment.split("/").some((part) => !part || part === "." || part === ".." || /[\u0000-\u0020\u007F?#\\%]/.test(part))) return null;
  return `/${family}/${segment}/`;
}

/** Parse and validate an ISO-like calendar date; return its date parts or null when invalid. */
function civilDateParts(date: string): { year: string; month: string; day: string } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(date);
  if (!match) return null;
  const [, year, month, day] = match;
  if (date.includes("T") && !Number.isFinite(Date.parse(date))) return null;
  const parsed = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (parsed.getUTCFullYear() !== Number(year) || parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)) {
    return null;
  }
  return { year, month, day };
}

/** Return the canonical blog route for a safe slug. */
export const blogPath = (slug: string | null | undefined): string | null => pathFor("blog", slug);
/** Return the canonical condition route for a safe slug. */
export const conditionPath = (slug: string | null | undefined): string | null => pathFor("conditions", slug);
/** Return the canonical provider route for a safe slug. */
export const providerPath = (slug: string | null | undefined): string | null => pathFor("providers", slug);

/** Keep the existing clinic-name fallback when Strapi has no explicit slug. */
export function clinicPath(clinic: Pick<ClinicRecord, "slug" | "clinicName">): string | null {
  const fallbackSlug = clinic.clinicName?.toLowerCase().replace(/\s+/g, "-");
  return pathFor("clinics", clinic.slug || fallbackSlug);
}

/** Use the validated stored date and safe slug to preserve dated service-update URLs. */
export function serviceUpdatePath(update: Pick<ServiceUpdateRecord, "slug" | "date">): string | null {
  const basePath = pathFor("service-updates", update.slug);
  if (!basePath) return null;
  if (!update.date) return null;
  const date = civilDateParts(update.date);
  if (!date) return null;
  return `/service-updates/${date.year}/${date.month}/${basePath.slice("/service-updates/".length)}`;
}

/** Stable helpers for REST adapters that need to reproduce Gatsby ordering. */
export function sortByOrder<T extends { order?: number | null }>(records: readonly T[]): T[] {
  return records.map((record, index) => ({ record, index }))
    .sort((a, b) => (a.record.order ?? Number.MAX_SAFE_INTEGER) - (b.record.order ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ record }) => record);
}

/** Sort newest valid dates first, keeping original order for ties and invalid dates last. */
export function sortByDateDescending<T extends { date?: string | null }>(records: readonly T[]): T[] {
  /** Map malformed or absent dates to negative infinity so they sort last. */
  const validTimestamp = (value: string | null | undefined): number => {
    if (!value || (/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value) && !civilDateParts(value))) return Number.NEGATIVE_INFINITY;
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : Number.NEGATIVE_INFINITY;
  };
  return records.map((record, index) => ({ record, index }))
    .sort((a, b) => {
      const left = validTimestamp(a.record.date);
      const right = validTimestamp(b.record.date);
      return right - left || a.index - b.index;
    })
    .map(({ record }) => record);
}
