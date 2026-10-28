import type {
  BlogRecord,
  ClinicRecord,
  ConditionRecord,
  JsonValue,
  MediaDescriptor,
  ProviderRecord,
  SiteSettings,
  ServiceUpdateRecord,
  AnnouncementSettings,
  TrackingSettings,
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
  internal?: GatsbyInternalContent | null;
}

/** Serialized internal field attached to Gatsby's queried content node. */
interface GatsbyInternalContent {
  content?: string | null;
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
  opening_hours?: GatsbyClockRange | null;
  shot_hours?: GatsbyClockRange | null;
}

/** Title and canonical URL selected from Gatsby site metadata. */
type GatsbySiteMetadata = {
  title?: string | null;
  siteUrl?: string | null;
  twitterHandle?: string | null;
};

/** Optional analytics identifiers selected from Gatsby site tracking settings. */
type GatsbyTrackingInfo = {
  googleAnalyticsId?: string | null;
  googleTagManagerId?: string | null;
  pixelId?: string | null;
};

/** Banner enablement, style, and serialized message selected from Gatsby. */
type GatsbyAnnouncementNode = {
  enabled?: boolean | null;
  /** Raw CMS style value; unsupported values normalize to the informational style. */
  type?: string | null;
  internal?: GatsbyInternalContent | null;
};

/** Nullable Gatsby provider query fields normalized into the shared provider record. */
type GatsbyProviderNode = GatsbyNode & {
  name?: GatsbyProviderName | null;
  retirementNotice?: GatsbyProviderRetirementNotice | null;
  review?: GatsbyProviderReview | null;
};

/** Clock times for one clinic service schedule. */
type GatsbyClockRange = { start_time?: string | null; end_time?: string | null };

/** Address, geographic coordinates, and display metadata selected for a clinic. */
type GatsbyClinicLocation = {
  address?: string | null;
  lat?: number | null;
  long?: number | null;
  placeId?: string | null;
  label_name?: string | null;
};

/** Phone and fax values selected for a Gatsby clinic. */
type GatsbyClinicContact = { phone?: string | null; fax?: string | null };

/** Nullable Gatsby clinic query fields normalized into the shared clinic record. */
type GatsbyClinicNode = GatsbyNode & {
  location?: GatsbyClinicLocation | null;
  contact?: GatsbyClinicContact | null;
  hours?: ReadonlyArray<GatsbyClinicHour | null> | null;
};

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
 * @returns A descriptor using Gatsby's fallback `src` as the default and `srcSet` only as responsive candidates, or undefined without a source.
 */
export function mapGatsbyMedia(media: GatsbyMedia | null | undefined): MediaDescriptor | undefined {
  if (!media) return undefined;
  const image = media.localFile?.childImageSharp?.gatsbyImageData;
  const fallback = image?.images?.fallback;
  // Gatsby's fallback.src is the default URL; srcSet remains the responsive candidate list.
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
 * @param metadata Site title, canonical URL, and optional social account handle.
 * @returns Settings with a default title when absent and optional URL/handle fields.
 */
export function mapGatsbySiteSettings(metadata: GatsbySiteMetadata): SiteSettings {
  const settings: SiteSettings = { title: metadata.title || "Untitled Site" };
  if (metadata.siteUrl) settings.url = metadata.siteUrl;
  if (metadata.twitterHandle) settings.twitterHandle = metadata.twitterHandle;
  return settings;
}

/** Map optional Gatsby analytics IDs to public tracking settings.
 * @param tracking Site query result containing any configured analytics identifiers.
 * @returns All three public IDs, with empty values for missing configuration.
 */
export function mapGatsbyTrackingSettings(tracking?: GatsbyTrackingInfo | null): TrackingSettings {
  return {
    googleAnalyticsId: tracking?.googleAnalyticsId || "",
    googleTagManagerId: tracking?.googleTagManagerId || "",
    pixelId: tracking?.pixelId || "",
  };
}

/** Map CMS announcement content to the banner's shared state.
 * @param node Optional announcement query result and serialized message content.
 * @returns Normalized banner state; unrecognized types use the informational style.
 */
export function mapGatsbyAnnouncement(node?: GatsbyAnnouncementNode | null): AnnouncementSettings {
  const type = node?.type === "error" || node?.type === "success" ? node.type : "info";
  const source = readInternalContent(node?.internal?.content);
  const message = jsonArray(source?.message);

  return omitUndefined({
    enabled: node?.enabled === true,
    type,
    message,
  }) as AnnouncementSettings;
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
export function mapGatsbyProvider(node: GatsbyProviderNode): ProviderRecord {
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
export function mapGatsbyClinic(node: GatsbyClinicNode): ClinicRecord {
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
