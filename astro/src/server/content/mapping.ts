// Converts raw Strapi records into the framework-neutral data shapes consumed by shared views.
import type {
  AnnouncementSettings,
  BlogRecord,
  ClinicRecord,
  ConditionRecord,
  ContentPageRecord,
  HomePageRecord,
  JsonValue,
  MediaDescriptor,
  ProviderRecord,
  ReviewRecord,
  ServiceUpdateRecord,
  TrackingSettings,
} from "../../../../src/shared/content/models.ts";
import { jsonValue, type StrapiEntity } from "./strapi.ts";
/** Flattened Strapi entity with fields awaiting normalization. */
type Entity = StrapiEntity & Record<string, unknown>;
/** Fields common to normalized route-bearing CMS records. */
type CommonContentFields = {
  documentId: string;
  id: string;
  slug: string | null;
  title: string;
  description?: string;
  date: string | null;
};
/** One responsive image URL and its intrinsic pixel width. */
type MediaCandidate = {
  src: string;
  width: number;
};
/** Read a string value from a CMS field.
 * @param value Untrusted field value.
 * @returns The string or undefined for a non-string.
 */
function string(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
/** Read a finite numeric value from a CMS field.
 * @param value Untrusted field value.
 * @returns The finite number or undefined.
 */
function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
/** Read a boolean value from a CMS field.
 * @param value Untrusted field value.
 * @returns The boolean or undefined.
 */
function bool(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
/** Remove undefined object fields recursively while keeping arrays serializable.
 * @param value Mapped CMS value.
 * @returns A copy without undefined object properties.
 */
function compact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((child) => (child === undefined ? null : compact(child))) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, compact(child)]),
    ) as T;
  }
  return value;
}
/** Read an object from a Strapi value or data envelope.
 * @param value Raw CMS value.
 * @returns The object, or undefined when absent or not an object.
 */
function record(value: unknown): Record<string, unknown> | undefined {
  const unwrapped =
    value && typeof value === "object" && "data" in value
      ? (
          value as {
            data: unknown;
          }
        ).data
      : value;
  return unwrapped && typeof unwrapped === "object" && !Array.isArray(unwrapped)
    ? (unwrapped as Record<string, unknown>)
    : undefined;
}
/** Read an array from a Strapi value or data envelope.
 * @param value Raw CMS value.
 * @returns The array, or undefined when absent or not an array.
 */
function list(value: unknown): unknown[] | undefined {
  const unwrapped =
    value && typeof value === "object" && "data" in value
      ? (
          value as {
            data: unknown;
          }
        ).data
      : value;
  return Array.isArray(unwrapped) ? unwrapped : undefined;
}
/** Normalize an optional rich-text or dynamic-zone array.
 * @param value Raw CMS blocks.
 * @returns JSON-safe blocks, or undefined when the input is not an array.
 */
function optionalJson(value: unknown): JsonValue[] | undefined {
  const normalized = jsonValue(value);
  return Array.isArray(normalized) ? normalized : undefined;
}
/** Map Strapi media into a serializable responsive descriptor.
 * @param value Strapi media object or data envelope.
 * @param baseUrl CMS origin for relative media URLs.
 * @returns The descriptor, or undefined if the media has no URL.
 */
export function mapStrapiMedia(value: unknown, baseUrl?: string): MediaDescriptor | undefined {
  const media = record(value);
  if (!media) {
    return undefined;
  }
  const attrs = (
    media.attributes && typeof media.attributes === "object" ? media.attributes : media
  ) as Record<string, unknown>;
  const rawUrl = string(attrs.url) ?? string(attrs.src);
  if (!rawUrl) {
    return undefined;
  }
  let src = rawUrl;
  if (baseUrl && rawUrl.startsWith("/")) {
    try {
      src = new URL(rawUrl, baseUrl).toString();
    } catch {
      /* Keep the original CMS URL. */
    }
  }
  const descriptor: MediaDescriptor = {
    src,
    alt: string(attrs.alternativeText) ?? string(attrs.altText) ?? string(attrs.name) ?? "",
  };
  const width = number(attrs.width);
  const height = number(attrs.height);
  const mimeType = string(attrs.mime);
  if (width !== undefined) {
    descriptor.width = width;
  }
  if (height !== undefined) {
    descriptor.height = height;
  }
  if (mimeType) {
    descriptor.mimeType = mimeType;
  }
  if (width && height) {
    descriptor.aspectRatio = width / height;
  }
  const formats =
    attrs.formats && typeof attrs.formats === "object"
      ? (attrs.formats as Record<string, unknown>)
      : undefined;
  if (formats) {
    const sources: MediaCandidate[] = [];
    const alternatives = new Map<string, MediaCandidate[]>();
    for (const value of Object.values(formats)) {
      const format = record(value);
      const formatUrl = string(format?.url);
      if (!formatUrl) {
        continue;
      }
      let formatSrc = formatUrl;
      if (baseUrl && formatUrl.startsWith("/")) {
        try {
          formatSrc = new URL(formatUrl, baseUrl).toString();
        } catch {
          /* Keep the original CMS URL. */
        }
      }
      const formatWidth = number(format?.width);
      if (!formatWidth) {
        continue;
      }
      const type =
        string(format?.mime) ??
        (string(format?.ext) ? `image/${string(format?.ext)!.slice(1)}` : mimeType);
      if (!type || type === mimeType) {
        sources.push({ src: formatSrc, width: formatWidth });
      } else if (type === "image/avif" || type === "image/webp") {
        alternatives.set(type, [
          ...(alternatives.get(type) ?? []),
          { src: formatSrc, width: formatWidth },
        ]);
      }
    }
    if (sources.length) {
      if (width) {
        sources.push({ src, width });
      }
      descriptor.sources = sources.sort((a, b) => a.width - b.width);
    }
    if (alternatives.size) {
      descriptor.formats = [...alternatives].map(([type, items]) => ({
        type,
        srcSet: items
          .sort((a, b) => a.width - b.width)
          .map((item) => `${item.src} ${item.width}w`)
          .join(", "),
      }));
    }
  }
  return descriptor;
}
/** Map identity and common route-bearing content fields.
 * @param entity Flattened Strapi entity.
 * @param fallbackTitle Title to use when neither title nor heading is present.
 * @returns Shared identity, route, title, description, and date fields.
 */
function common(entity: Entity, fallbackTitle = ""): CommonContentFields {
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
/** Normalize a Strapi blog into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @param mediaBaseUrl CMS origin used to resolve relative media URLs.
 * @returns The serializable blog values.
 */
export function mapStrapiBlog(entity: StrapiEntity, mediaBaseUrl?: string): BlogRecord {
  const source = entity as Entity;
  return compact({
    ...common(source),
    heading: string(source.heading) ?? undefined,
    content: optionalJson(source.content),
    thumbnail: mapStrapiMedia(source.thumbnail, mediaBaseUrl),
  });
}
/** Normalize a Strapi condition into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @param mediaBaseUrl CMS origin used to resolve relative media URLs.
 * @returns The serializable condition values.
 */
export function mapStrapiCondition(entity: StrapiEntity, mediaBaseUrl?: string): ConditionRecord {
  const source = entity as Entity;
  return compact({
    ...common(source),
    heading: string(source.heading) ?? undefined,
    order: number(source.order) ?? null,
    content: optionalJson(source.content),
    thumbnail: mapStrapiMedia(source.thumbnail, mediaBaseUrl),
  });
}
/** Normalize a Strapi provider into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @param mediaBaseUrl CMS origin used to resolve relative media URLs.
 * @returns The serializable provider values.
 */
export function mapStrapiProvider(entity: StrapiEntity, mediaBaseUrl?: string): ProviderRecord {
  const source = entity as Entity;
  const name = record(source.name);
  const review = record(source.review);
  const retirement = record(source.retirementNotice);
  const provider: ProviderRecord = {
    ...common(source, string(name?.fullName) ?? ""),
    order: number(source.order) ?? null,
    image: mapStrapiMedia(source.image, mediaBaseUrl),
    body: optionalJson(source.body),
  };
  if (name) {
    provider.name = {
      fullName: string(name.fullName),
      honorific: string(name.honorific),
      qualificationLong: string(name.qualificationLong),
      qualificationAbbr: string(name.qualificationAbbr),
    };
  }
  if (review) {
    provider.review = {
      text: string(review.text),
      reviewer: string(review.reviewer),
      date: string(review.date) ?? null,
      link: string(review.link),
    };
  }
  if (retirement) {
    provider.retirementNotice = {
      retired: bool(retirement.retired),
      text: optionalJson(retirement.text),
    };
  }
  return compact(provider);
}
/** Normalize a Strapi clinic into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @returns The serializable clinic values.
 */
export function mapStrapiClinic(entity: StrapiEntity): ClinicRecord {
  const source = entity as Entity;
  const location = record(source.location);
  const contact = record(source.contact);
  const hours = list(source.hours)
    ?.map((item) => record(item))
    .filter((item): item is Record<string, unknown> => !!item)
    .map((hour) => {
      const opening = record(hour.opening_hours);
      const shot = record(hour.shot_hours);
      return {
        day: string(hour.day),
        open: bool(hour.open),
        openingHours: opening
          ? { startTime: string(opening.start_time), endTime: string(opening.end_time) }
          : undefined,
        shotHours: shot
          ? { startTime: string(shot.start_time), endTime: string(shot.end_time) }
          : undefined,
      };
    });
  const mapped: ClinicRecord = {
    ...common(source, string(source.clinic_name) ?? ""),
    clinicName: string(source.clinic_name) ?? null,
    body: optionalJson(source.body),
  };
  if (location) {
    mapped.location = {
      address: string(location.address),
      latitude: number(location.lat) ?? null,
      longitude: number(location.long) ?? null,
      placeId: string(location.placeId),
      label: string(location.label_name),
    };
  }
  if (contact) {
    mapped.contact = { phone: string(contact.phone), fax: string(contact.fax) };
  }
  if (hours) {
    mapped.hours = hours;
  }
  return compact(mapped);
}
/** Normalize a Strapi service update into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @returns The serializable service update values.
 */
export function mapStrapiServiceUpdate(entity: StrapiEntity): ServiceUpdateRecord {
  const source = entity as Entity;
  return compact({
    ...common(source),
    date: string(source.date) ?? null,
    body: optionalJson(source.body),
  });
}
/** Normalize a Strapi patient review into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @returns The serializable patient review values.
 */
export function mapStrapiReview(entity: StrapiEntity): ReviewRecord {
  const source = entity as Entity;
  return compact({
    documentId: source.documentId,
    id: source.documentId,
    name: string(source.name) ?? "",
    stars: number(source.stars),
    content: optionalJson(source.content),
    sourceName: string(source.sourceName),
    sourceUrl: string(source.sourceUrl),
  });
}
/** Normalize a Strapi fixed or archive page into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @returns The serializable fixed or archive page values.
 */
export function mapStrapiPage(entity: StrapiEntity): ContentPageRecord {
  const source = entity as Entity;
  return compact({
    documentId: source.documentId,
    id: source.documentId,
    heading: string(source.heading),
    title: string(source.title),
    description: string(source.description),
    metaDescription: string(source.metaDescription),
    text: optionalJson(source.text),
  });
}
/** Normalize a Strapi homepage into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @param mediaBaseUrl CMS origin used to resolve relative media URLs.
 * @returns The serializable homepage values.
 */
export function mapStrapiHomePage(entity: StrapiEntity, mediaBaseUrl?: string): HomePageRecord {
  const source = entity as Entity;
  const mapped: HomePageRecord = {
    documentId: source.documentId,
    id: source.documentId,
    metaDescription: string(source.metaDescription),
  };
  for (const key of [
    "hero",
    "genericBelowHero",
    "conditions",
    "serviceUpdates",
    "blog",
    "providers",
    "feedback",
    "locations",
    "contact",
  ] as const) {
    /** Normalize one homepage section and resolve its media URLs.
     * @param raw Section data from Strapi.
     * @returns Serializable section data, or undefined if unsupported.
     */
    const normalizeSection = (raw: unknown): JsonValue | undefined => {
      const section = record(raw);
      let value: JsonValue | undefined;
      if (section && "media" in section) {
        const normalized: Record<string, JsonValue> = {};
        for (const [field, child] of Object.entries(section)) {
          if (field === "media") {
            const media = list(child)
              ?.map((item) => mapStrapiMedia(item, mediaBaseUrl))
              .filter((item): item is MediaDescriptor => !!item);
            if (media) {
              normalized.media = media as unknown as JsonValue;
            }
          } else {
            const json = jsonValue(child);
            if (json !== undefined) {
              normalized[field] = json;
            }
          }
        }
        value = normalized;
      } else {
        value = jsonValue(raw);
      }
      return value;
    };
    const raw = source[key];
    const value = Array.isArray(raw)
      ? raw.map(normalizeSection).filter((item): item is JsonValue => item !== undefined)
      : normalizeSection(raw);
    if (value !== undefined) {
      mapped[key] = value;
    }
  }
  return compact(mapped);
}
/** Normalize a Strapi announcement into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @returns The serializable announcement values.
 */
export function mapStrapiAnnouncement(entity: StrapiEntity): AnnouncementSettings {
  const source = entity as Entity;
  const type = source.type === "error" || source.type === "success" ? source.type : "info";
  return compact({ enabled: source.enabled === true, type, message: optionalJson(source.message) });
}
/** Normalize a Strapi tracking settings into the shared content contract.
 * @param entity Flattened Strapi entity.
 * @returns The serializable tracking settings values.
 */
export function mapStrapiTrackingInfo(entity: StrapiEntity): TrackingSettings {
  const source = entity as Entity;
  return {
    googleAnalyticsId: string(source.googleAnalyticsId) ?? "",
    googleTagManagerId: string(source.googleTagManagerId) ?? "",
    pixelId: string(source.pixelId) ?? "",
  };
}
/** Normalize Strapi blocks into JSON-safe content.
 * @param value Raw block array from the CMS.
 * @returns Normalized blocks, or undefined when the input is not an array.
 */
export function mapStrapiBlocks(value: unknown): JsonValue[] | undefined {
  return optionalJson(value);
}
