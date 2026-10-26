import type {
  BlogRecord,
  ClinicRecord,
  ConditionRecord,
  JsonValue,
  MediaDescriptor,
  ProviderRecord,
  SiteSettings,
  ServiceUpdateRecord,
} from "./models";

/** Gatsby image plugin output fields used to extract a plain media source. */
interface GatsbyImageData {
  images?: { fallback?: { src?: string; width?: number; height?: number; srcSet?: string } };
  width?: number;
  height?: number;
  src?: string;
  srcSet?: string;
}

/** Nullable media shape returned by current Gatsby and Strapi GraphQL queries. */
interface GatsbyMedia {
  url?: string | null;
  publicURL?: string | null;
  altText?: string | null;
  alternativeText?: string | null;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  localFile?: {
    publicURL?: string | null;
    childImageSharp?: { gatsbyImageData?: GatsbyImageData | null } | null;
  } | null;
}

/** Common nullable fields selected for Gatsby content records. */
interface GatsbyNode {
  id: string;
  slug?: string | null;
  title?: string | null;
  heading?: string | null;
  description?: string | null;
  date?: string | null;
  formattedDate?: string | null;
  order?: number | null;
  clinic_name?: string | null;
  thumbnail?: GatsbyMedia | null;
  image?: GatsbyMedia | null;
  internal?: { content?: string | null } | null;
}

/** Nullable Gatsby provider-name fields normalized into the shared provider record. */
interface GatsbyProviderName {
  fullName?: string | null;
  honorific?: string | null;
  qualificationLong?: string | null;
  qualificationAbbr?: string | null;
}

/** Nullable review fields selected for a Gatsby provider. */
interface GatsbyProviderReview {
  text?: string | null;
  reviewer?: string | null;
  date?: string | null;
  link?: string | null;
}

/** Nullable retirement flag selected from Gatsby provider data. */
interface GatsbyProviderRetirementNotice {
  retired?: boolean | null;
}

/** Gatsby clinic hours use snake-case names and nullable nested values. */
interface GatsbyClinicHour {
  day?: string | null;
  open?: boolean | null;
  opening_hours?: { start_time?: string | null; end_time?: string | null } | null;
  shot_hours?: { start_time?: string | null; end_time?: string | null } | null;
}

/** Normalize optional Gatsby text for required shared fields.
 * @param value Nullable string from a Gatsby query.
 * @returns The original nonempty string, or `""` when absent or empty.
 */
function stringOrEmpty(value: string | null | undefined): string {
  return value || "";
}

/** Recursively omit undefined object fields while preserving nulls and array positions.
 * @param value Object, array, or scalar to normalize.
 * @returns The same data shape with undefined object properties removed.
 */
function omitUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(omitUndefined) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, omitUndefined(child)]),
    ) as T;
  }
  return value;
}

/** Parse Gatsby's serialized internal content as a JSON object.
 * @param value Nullable JSON text.
 * @returns A parsed object, or null for empty, malformed, array, or scalar input.
 */
function readInternalContent(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/** Narrow unknown data to an array of JSON-safe values.
 * @param value Untrusted parsed data.
 * @returns A JSON value array, or undefined when it is not a valid array.
 */
function jsonArray(value: unknown): JsonValue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every(isJsonValue) ? value : undefined;
}

/** Read a rich-text field from Gatsby's serialized internal content.
 * @param node Gatsby query result with optional serialized internal content.
 * @param key Either the `body` or `content` field to read.
 * @returns A JSON-safe array, or undefined when missing or invalid.
 */
export function mapGatsbyBlocks(node: GatsbyNode, key: "body" | "content"): JsonValue[] | undefined {
  const source = readInternalContent(node.internal?.content);
  return jsonArray(source?.[key]);
}

/** Convert nullable Gatsby image metadata to plain shared media data.
 * @param media Nullable Gatsby or Strapi media query result.
 * @returns A descriptor with public URL, alt text, optional pixel dimensions/srcSet, or undefined without a source.
 */
export function mapGatsbyMedia(media: GatsbyMedia | null | undefined): MediaDescriptor | undefined {
  if (!media) return undefined;
  const image = media.localFile?.childImageSharp?.gatsbyImageData;
  const fallback = image?.images?.fallback;
  const src = fallback?.src || image?.src || media.localFile?.publicURL || media.publicURL || media.url;
  if (!src) return undefined;
  const srcSet = fallback?.srcSet || image?.srcSet;
  const descriptor: MediaDescriptor = {
    src,
    alt: media.altText || media.alternativeText || "",
  };
  const width = fallback?.width || image?.width || media.width;
  const height = fallback?.height || image?.height || media.height;
  if (width != null) descriptor.width = width;
  if (height != null) descriptor.height = height;
  if (media.mime) descriptor.mimeType = media.mime;
  if (srcSet) descriptor.srcSet = srcSet;
  return descriptor;
}

/** Normalize queried Gatsby metadata into public site settings.
 * @param metadata Nullable title/site URL values selected by the Gatsby query.
 * @returns Site settings with an empty title when no title is available.
 */
export function mapGatsbySiteSettings(metadata: { title?: string | null; siteUrl?: string | null }): SiteSettings {
  const settings: SiteSettings = { title: metadata.title || "" };
  if (metadata.siteUrl) settings.url = metadata.siteUrl;
  return settings;
}

/** Map a Gatsby blog query node to the shared content contract.
 * @param node Gatsby blog fields, including nullable slug, date, content, and thumbnail.
 * @returns A normalized blog record with serializable content and media.
 */
export function mapGatsbyBlog(node: GatsbyNode): BlogRecord {
  return omitUndefined({
    id: node.id,
    slug: node.slug || null,
    title: stringOrEmpty(node.title || node.heading),
    heading: node.heading || undefined,
    description: node.description || undefined,
    date: node.date || null,
    content: mapGatsbyBlocks(node, "content"),
    thumbnail: mapGatsbyMedia(node.thumbnail),
  }) as BlogRecord;
}

/** Map a Gatsby condition query node to the shared content contract.
 * @param node Gatsby condition fields, including nullable slug, ordering, content, and thumbnail.
 * @returns A normalized condition record.
 */
export function mapGatsbyCondition(node: GatsbyNode): ConditionRecord {
  return omitUndefined({
    id: node.id,
    slug: node.slug || null,
    title: stringOrEmpty(node.title || node.heading),
    heading: node.heading || undefined,
    description: node.description || undefined,
    order: node.order,
    content: mapGatsbyBlocks(node, "content"),
    thumbnail: mapGatsbyMedia(node.thumbnail),
  }) as ConditionRecord;
}

/** Map Gatsby provider fields and rich text into the framework-neutral shape.
 * @param node Gatsby provider fields with nullable name, retirement, and review groups.
 * @returns A normalized provider record with optional nested values omitted when absent.
 */
export function mapGatsbyProvider(node: GatsbyNode & {
  name?: GatsbyProviderName | null;
  retirementNotice?: GatsbyProviderRetirementNotice | null;
  review?: GatsbyProviderReview | null;
}): ProviderRecord {
  const content = readInternalContent(node.internal?.content);
  const rawNotice = content?.retirementNotice;
  const noticeText = rawNotice && typeof rawNotice === "object" && !Array.isArray(rawNotice)
    ? jsonArray((rawNotice as Record<string, unknown>).text)
    : undefined;
  return omitUndefined({
    id: node.id,
    slug: node.slug || null,
    title: node.name?.fullName || "",
    description: node.description || undefined,
    order: node.order,
    body: mapGatsbyBlocks(node, "body"),
    name: node.name ? {
      fullName: node.name.fullName ?? undefined,
      honorific: node.name.honorific ?? undefined,
      qualificationLong: node.name.qualificationLong ?? undefined,
      qualificationAbbr: node.name.qualificationAbbr ?? undefined,
    } : undefined,
    retirementNotice: node.retirementNotice || noticeText ? {
      retired: node.retirementNotice?.retired ?? undefined,
      text: noticeText,
    } : undefined,
    review: node.review ? {
      text: node.review.text ?? undefined,
      reviewer: node.review.reviewer ?? undefined,
      date: node.review.date ?? undefined,
      link: node.review.link ?? undefined,
    } : undefined,
    image: mapGatsbyMedia(node.image),
  }) as ProviderRecord;
}

/** Map Gatsby clinic fields, translating nested snake-case location and hour values.
 * @param node Gatsby clinic query fields, including nullable location, contact, and hours.
 * @returns A normalized clinic record with nullable query values omitted.
 */
export function mapGatsbyClinic(node: GatsbyNode & {
  location?: { address?: string | null; lat?: number | null; long?: number | null; placeId?: string | null; label_name?: string | null } | null;
  contact?: { phone?: string | null; fax?: string | null } | null;
  hours?: Array<GatsbyClinicHour | null> | null;
}): ClinicRecord {
  return omitUndefined({
    id: node.id,
    slug: node.slug || null,
    title: node.title || node.clinic_name || "",
    clinicName: node.clinic_name || null,
    description: node.description || undefined,
    body: mapGatsbyBlocks(node, "body"),
    location: node.location ? {
      address: node.location.address || undefined,
      latitude: node.location.lat,
      longitude: node.location.long,
      placeId: node.location.placeId || undefined,
      label: node.location.label_name || undefined,
    } : undefined,
    contact: node.contact ? { phone: node.contact.phone || undefined, fax: node.contact.fax || undefined } : undefined,
    hours: node.hours?.filter((hour): hour is GatsbyClinicHour => hour != null).map((hour) => ({
      day: hour.day || undefined,
      open: hour.open ?? undefined,
      openingHours: hour.opening_hours ? { startTime: hour.opening_hours.start_time || undefined, endTime: hour.opening_hours.end_time || undefined } : undefined,
      shotHours: hour.shot_hours ? { startTime: hour.shot_hours.start_time || undefined, endTime: hour.shot_hours.end_time || undefined } : undefined,
    })),
  }) as ClinicRecord;
}

/** Map a Gatsby service-update query node to the shared record shape.
 * @param node Gatsby update fields, including a nullable stored date.
 * @returns A normalized update record; the nullable date remains available for route validation.
 */
export function mapGatsbyServiceUpdate(node: GatsbyNode): ServiceUpdateRecord {
  return omitUndefined({
    id: node.id,
    slug: node.slug || null,
    title: node.title || "",
    description: node.description || undefined,
    date: node.date || null,
    body: mapGatsbyBlocks(node, "body"),
  }) as ServiceUpdateRecord;
}

/** Check whether unknown data can cross the framework boundary as JSON.
 * @param value Any runtime value.
 * @returns True for finite JSON scalars, arrays, and objects containing only JSON values.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}
