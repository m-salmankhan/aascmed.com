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

interface GatsbyImageData {
  images?: { fallback?: { src?: string; width?: number; height?: number; srcSet?: string }; sources?: Array<{ srcSet?: string }> };
  width?: number;
  height?: number;
  src?: string;
  srcSet?: string;
}

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

/** Gatsby component fields are nullable even when shared view fields are not. */
interface GatsbyProviderName {
  fullName?: string | null;
  honorific?: string | null;
  qualificationLong?: string | null;
  qualificationAbbr?: string | null;
}

interface GatsbyProviderReview {
  text?: string | null;
  reviewer?: string | null;
  date?: string | null;
  link?: string | null;
}

interface GatsbyProviderRetirementNotice {
  retired?: boolean | null;
}

interface GatsbyClinicHour {
  day?: string | null;
  open?: boolean | null;
  opening_hours?: { start_time?: string | null; end_time?: string | null } | null;
  shot_hours?: { start_time?: string | null; end_time?: string | null } | null;
}

function stringOrEmpty(value: string | null | undefined): string {
  return value || "";
}

/** Keep absent optional fields out of objects crossing the JSON content boundary. */
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

function readInternalContent(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function jsonArray(value: unknown): JsonValue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.every(isJsonValue) ? value : undefined;
}

export function mapGatsbyBlocks(node: GatsbyNode, key: "body" | "content"): JsonValue[] | undefined {
  const source = readInternalContent(node.internal?.content);
  return jsonArray(source?.[key]);
}

export function mapGatsbyMedia(media: GatsbyMedia | null | undefined): MediaDescriptor | undefined {
  if (!media) return undefined;
  const image = media.localFile?.childImageSharp?.gatsbyImageData;
  const fallback = image?.images?.fallback;
  const src = fallback?.src || image?.src || media.localFile?.publicURL || media.publicURL || media.url;
  if (!src) return undefined;
  const srcSet = fallback?.srcSet || image?.srcSet;
  const descriptor: MediaDescriptor = {
    src,
    alt: media.altText || media.alternativeText || (media as GatsbyMedia & { name?: string | null }).name || "",
  };
  const width = fallback?.width || image?.width || media.width;
  const height = fallback?.height || image?.height || media.height;
  if (width != null) descriptor.width = width;
  if (height != null) descriptor.height = height;
  if (srcSet) descriptor.srcSet = srcSet;
  const mimeType = media.mime || (media as GatsbyMedia & { mimeType?: string | null }).mimeType;
  if (mimeType) descriptor.mimeType = mimeType;
  const candidates = (fallback?.srcSet || image?.srcSet || "").split(",").map((candidate) => {
    const match = candidate.trim().match(/^(\S+)\s+(\d+)w$/);
    return match ? { src: match[1], width: Number(match[2]) } : undefined;
  }).filter((candidate): candidate is { src: string; width: number } => !!candidate);
  if (candidates.length) descriptor.sources = candidates;
  if (width && height) descriptor.aspectRatio = width / height;
  return descriptor;
}

export function mapGatsbySiteSettings(metadata: { title?: string | null; siteUrl?: string | null; twitterHandle?: string | null }): SiteSettings {
  const settings: SiteSettings = { title: metadata.title || "Untitled Site" };
  if (metadata.siteUrl) settings.url = metadata.siteUrl;
  if (metadata.twitterHandle) settings.twitterHandle = metadata.twitterHandle;
  return settings;
}

export function mapGatsbyTrackingSettings(tracking?: {
  googleAnalyticsId?: string | null;
  googleTagManagerId?: string | null;
  pixelId?: string | null;
} | null): TrackingSettings {
  return {
    googleAnalyticsId: tracking?.googleAnalyticsId || "",
    googleTagManagerId: tracking?.googleTagManagerId || "",
    pixelId: tracking?.pixelId || "",
  };
}

export function mapGatsbyAnnouncement(node?: {
  enabled?: boolean | null;
  type?: string | null;
  internal?: { content?: string | null } | null;
} | null): AnnouncementSettings {
  const type = node?.type === "error" || node?.type === "success" ? node.type : "info";
  const source = readInternalContent(node?.internal?.content);
  const message = jsonArray(source?.message);

  return omitUndefined({
    enabled: node?.enabled === true,
    type,
    message,
  }) as AnnouncementSettings;
}

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

/** Type guard for adapter data that is safe to pass through as JSON. */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).every(isJsonValue);
  return false;
}
