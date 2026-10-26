import type { ClinicRecord, ServiceUpdateRecord } from "./models";

/** Build a safe trailing-slash route.
 * @param family Route family segment, such as `blog`.
 * @param slug Relative slug, optionally null or undefined.
 * @returns `/<family>/<slug>/`, or null when the slug is absent or unsafe.
 */
function pathFor(family: string, slug: string | null | undefined): string | null {
  const segment = slug?.replace(/^\/+|\/+$/g, "");
  if (!segment || segment.split("/").some((part) => !part || part === "." || part === ".." || /[\u0000-\u0020\u007F?#\\%]/.test(part))) return null;
  return `/${family}/${segment}/`;
}

/** Validate an ISO-like calendar date rather than a timestamp or natural-language date.
 * @param date `YYYY-MM-DD` or `YYYY-MM-DDT...` text.
 * @returns Zero-padded `{ year, month, day }` strings from the written date, or null if malformed, impossible, or timestamp-invalid.
 */
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

/** Return the canonical blog route.
 * @param slug Nullable blog slug.
 * @returns `/blog/<slug>/`, or null for an absent or unsafe slug.
 */
export const blogPath = (slug: string | null | undefined): string | null => pathFor("blog", slug);
/** Return the canonical condition route.
 * @param slug Nullable condition slug.
 * @returns `/conditions/<slug>/`, or null for an absent or unsafe slug.
 */
export const conditionPath = (slug: string | null | undefined): string | null => pathFor("conditions", slug);
/** Return the canonical provider route.
 * @param slug Nullable provider slug.
 * @returns `/providers/<slug>/`, or null for an absent or unsafe slug.
 */
export const providerPath = (slug: string | null | undefined): string | null => pathFor("providers", slug);

/** Build a clinic route, falling back to a lowercase hyphenated clinic name.
 * @param clinic Clinic slug and nullable name.
 * @returns `/clinics/<slug>/`, or null if neither value yields a safe slug.
 */
export function clinicPath(clinic: Pick<ClinicRecord, "slug" | "clinicName">): string | null {
  const fallbackSlug = clinic.clinicName?.toLowerCase().replace(/\s+/g, "-");
  return pathFor("clinics", clinic.slug || fallbackSlug);
}

/** Build a dated service-update route from its stored calendar date and slug.
 * @param update Service-update slug and nullable date.
 * @returns A dated route, or null when either value is invalid or absent.
 */
export function serviceUpdatePath(update: Pick<ServiceUpdateRecord, "slug" | "date">): string | null {
  const basePath = pathFor("service-updates", update.slug);
  if (!basePath) return null;
  if (!update.date) return null;
  const date = civilDateParts(update.date);
  if (!date) return null;
  return `/service-updates/${date.year}/${date.month}/${basePath.slice("/service-updates/".length)}`;
}

/** Sort by ascending numeric order while preserving input order for ties.
 * @param records Read-only records with optional numeric order values.
 * @returns A newly sorted array; missing and null orders appear last.
 */
export function sortByOrder<T extends { order?: number | null }>(records: readonly T[]): T[] {
  return records.map((record, index) => ({ record, index }))
    .sort((a, b) => (a.record.order ?? Number.MAX_SAFE_INTEGER) - (b.record.order ?? Number.MAX_SAFE_INTEGER) || a.index - b.index)
    .map(({ record }) => record);
}

/** Sort newest valid date strings first while preserving input order for ties.
 * @param records Read-only records with optional date strings.
 * @returns A newly sorted array; absent and invalid dates appear last.
 */
export function sortByDateDescending<T extends { date?: string | null }>(records: readonly T[]): T[] {
  /** Convert date text to a sortable timestamp.
   * @param value Nullable date text.
   * @returns Milliseconds since the Unix epoch, or negative infinity when invalid.
   */
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
