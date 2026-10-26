import type {
  AnnouncementSettings, BlogRecord, ClinicRecord, ConditionRecord, ContentPageRecord,
  HomePageRecord, JsonValue, MediaDescriptor, ProviderRecord, ReviewRecord,
  ServiceUpdateRecord, TrackingSettings,
} from "../../../../src/shared/content/models.ts";
import { jsonValue, type StrapiEntity } from "./strapi.ts";

type Entity = StrapiEntity & Record<string, unknown>;

function string(value: unknown): string | undefined { return typeof value === "string" ? value : undefined; }
function number(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function bool(value: unknown): boolean | undefined { return typeof value === "boolean" ? value : undefined; }
function record(value: unknown): Record<string, unknown> | undefined {
  const unwrapped = value && typeof value === "object" && "data" in value ? (value as { data: unknown }).data : value;
  return unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped) ? unwrapped as Record<string, unknown> : undefined;
}
function list(value: unknown): unknown[] | undefined {
  const unwrapped = value && typeof value === "object" && "data" in value ? (value as { data: unknown }).data : value;
  return Array.isArray(unwrapped) ? unwrapped : undefined;
}
function optionalJson(value: unknown): JsonValue[] | undefined {
  const normalized = jsonValue(value);
  return Array.isArray(normalized) ? normalized : undefined;
}

export function mapStrapiMedia(value: unknown, baseUrl?: string): MediaDescriptor | undefined {
  const media = record(value);
  if (!media) return undefined;
  const attrs = (media.attributes && typeof media.attributes === "object" ? media.attributes : media) as Record<string, unknown>;
  const rawUrl = string(attrs.url) ?? string(attrs.src);
  if (!rawUrl) return undefined;
  let src = rawUrl;
  if (baseUrl && rawUrl.startsWith("/")) {
    try { src = new URL(rawUrl, baseUrl).toString(); } catch { /* Keep the original CMS URL. */ }
  }
  const descriptor: MediaDescriptor = {
    src,
    alt: string(attrs.alternativeText) ?? string(attrs.altText) ?? string(attrs.name) ?? "",
  };
  const width = number(attrs.width); const height = number(attrs.height);
  const mimeType = string(attrs.mime);
  if (width !== undefined) descriptor.width = width;
  if (height !== undefined) descriptor.height = height;
  if (mimeType) descriptor.mimeType = mimeType;
  if (width && height) descriptor.aspectRatio = width / height;

  const formats = attrs.formats && typeof attrs.formats === "object" ? attrs.formats as Record<string, unknown> : undefined;
  if (formats) {
    const sources: Array<{ src: string; width: number }> = [];
    for (const [name, value] of Object.entries(formats)) {
      const format = record(value);
      const formatUrl = string(format?.url);
      if (!formatUrl) continue;
      let formatSrc = formatUrl;
      if (baseUrl && formatUrl.startsWith("/")) {
        try { formatSrc = new URL(formatUrl, baseUrl).toString(); } catch { /* Keep the original CMS URL. */ }
      }
      const formatWidth = number(format?.width);
      if (formatWidth) sources.push({ src: formatSrc, width: formatWidth });
      if (["avif", "webp"].includes(string(format?.ext)?.slice(1) ?? name)) {
        // Strapi media format objects don't include srcSet; a single URL remains a valid source.
        descriptor.formats = [...(descriptor.formats ?? []), { type: `image/${string(format?.ext)?.slice(1) ?? name}`, srcSet: formatSrc }];
      }
    }
    if (sources.length) descriptor.sources = sources.sort((a, b) => a.width - b.width);
  }
  return descriptor;
}

function common(entity: Entity, fallbackTitle = ""): { documentId: string; id: string; slug: string | null; title: string; description?: string; date: string | null } {
  const title = string(entity.title) ?? string(entity.heading) ?? fallbackTitle;
  return {
    documentId: entity.documentId,
    id: entity.documentId,
    slug: string(entity.slug) ?? null,
    title,
    description: string(entity.description) ?? undefined,
    date: string(entity.date) ?? null,
  };
}

export function mapStrapiBlog(entity: StrapiEntity, mediaBaseUrl?: string): BlogRecord {
  const source = entity as Entity;
  return {
    ...common(source),
    heading: string(source.heading) ?? undefined,
    content: optionalJson(source.content),
    thumbnail: mapStrapiMedia(source.thumbnail, mediaBaseUrl),
  };
}

export function mapStrapiCondition(entity: StrapiEntity, mediaBaseUrl?: string): ConditionRecord {
  const source = entity as Entity;
  return {
    ...common(source), heading: string(source.heading) ?? undefined, order: number(source.order) ?? null,
    content: optionalJson(source.content), thumbnail: mapStrapiMedia(source.thumbnail, mediaBaseUrl),
  };
}

export function mapStrapiProvider(entity: StrapiEntity, mediaBaseUrl?: string): ProviderRecord {
  const source = entity as Entity;
  const name = record(source.name); const review = record(source.review); const retirement = record(source.retirementNotice);
  const provider: ProviderRecord = {
    ...common(source), order: number(source.order) ?? null,
    image: mapStrapiMedia(source.image, mediaBaseUrl),
    body: optionalJson(source.body),
  };
  if (name) provider.name = {
    fullName: string(name.fullName), honorific: string(name.honorific),
    qualificationLong: string(name.qualificationLong), qualificationAbbr: string(name.qualificationAbbr),
  };
  if (review) provider.review = {
    text: string(review.text), reviewer: string(review.reviewer), date: string(review.date) ?? null, link: string(review.link),
  };
  if (retirement) provider.retirementNotice = { retired: bool(retirement.retired), text: optionalJson(retirement.text) };
  return provider;
}

export function mapStrapiClinic(entity: StrapiEntity): ClinicRecord {
  const source = entity as Entity;
  const location = record(source.location); const contact = record(source.contact);
  const hours = list(source.hours)?.map((item) => record(item)).filter((item): item is Record<string, unknown> => !!item).map((hour) => {
    const opening = record(hour.opening_hours); const shot = record(hour.shot_hours);
    return {
      day: string(hour.day), open: bool(hour.open),
      openingHours: opening ? { startTime: string(opening.start_time), endTime: string(opening.end_time) } : undefined,
      shotHours: shot ? { startTime: string(shot.start_time), endTime: string(shot.end_time) } : undefined,
    };
  });
  const mapped: ClinicRecord = {
    ...common(source), clinicName: string(source.clinic_name) ?? null, body: optionalJson(source.body),
  };
  if (location) mapped.location = {
    address: string(location.address), latitude: number(location.lat) ?? null,
    longitude: number(location.long) ?? null, placeId: string(location.placeId), label: string(location.label_name),
  };
  if (contact) mapped.contact = { phone: string(contact.phone), fax: string(contact.fax) };
  if (hours) mapped.hours = hours;
  return mapped;
}

export function mapStrapiServiceUpdate(entity: StrapiEntity): ServiceUpdateRecord {
  const source = entity as Entity;
  return { ...common(source), date: string(source.date) ?? null, body: optionalJson(source.body) };
}

export function mapStrapiReview(entity: StrapiEntity): ReviewRecord {
  const source = entity as Entity;
  return {
    documentId: source.documentId, id: source.documentId, name: string(source.name) ?? "",
    stars: number(source.stars), content: optionalJson(source.content),
    sourceName: string(source.sourceName), sourceUrl: string(source.sourceUrl),
  };
}

export function mapStrapiPage(entity: StrapiEntity): ContentPageRecord {
  const source = entity as Entity;
  return {
    documentId: source.documentId, id: source.documentId,
    heading: string(source.heading), title: string(source.title), description: string(source.description),
    metaDescription: string(source.metaDescription), text: optionalJson(source.text),
  };
}

export function mapStrapiHomePage(entity: StrapiEntity, mediaBaseUrl?: string): HomePageRecord {
  const source = entity as Entity;
  const mapped: HomePageRecord = { documentId: source.documentId, id: source.documentId, metaDescription: string(source.metaDescription) };
  for (const key of ["hero", "genericBelowHero", "conditions", "serviceUpdates", "blog", "providers", "feedback", "locations", "contact"] as const) {
    const raw = source[key];
    const section = record(raw);
    let value: JsonValue | undefined;
    if (section && "media" in section) {
      const normalized: Record<string, JsonValue> = {};
      for (const [field, child] of Object.entries(section)) {
        if (field === "media") {
          const media = list(child)?.map((item) => mapStrapiMedia(item, mediaBaseUrl)).filter((item): item is MediaDescriptor => !!item);
          if (media) normalized.media = media as unknown as JsonValue;
        } else {
          const json = jsonValue(child);
          if (json !== undefined) normalized[field] = json;
        }
      }
      value = normalized;
    } else value = jsonValue(raw);
    if (value !== undefined) mapped[key] = value;
  }
  return mapped;
}

export function mapStrapiAnnouncement(entity: StrapiEntity): AnnouncementSettings {
  const source = entity as Entity;
  const type = source.type === "error" || source.type === "success" ? source.type : "info";
  return { enabled: source.enabled === true, type, message: optionalJson(source.message) };
}

export function mapStrapiTrackingInfo(entity: StrapiEntity): TrackingSettings {
  const source = entity as Entity;
  return {
    googleAnalyticsId: string(source.googleAnalyticsId) ?? "",
    googleTagManagerId: string(source.googleTagManagerId) ?? "",
    pixelId: string(source.pixelId) ?? "",
  };
}

export function mapStrapiBlocks(value: unknown): JsonValue[] | undefined { return optionalJson(value); }
