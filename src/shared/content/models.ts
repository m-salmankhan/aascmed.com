/** JSON scalar values used for serializable CMS data. */
export type JsonPrimitive = string | number | boolean | null;
/** Recursively JSON-safe data used for CMS rich text and dynamic-zone content. */
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Strapi Blocks nodes and dynamic-zone entries stay data; views create React elements. */
export type ContentBlock = { [key: string]: JsonValue };
/** One serializable Strapi dynamic-zone entry, identified by its component name. */
export type DynamicZoneItem = { __component: string; [key: string]: JsonValue };

/** A generated or uploaded image variant with its source dimensions and format. */
export interface MediaFormat {
  /** Public URL for this image variant. */
  src: string;
  /** Intrinsic image dimensions in pixels. */
  width?: number;
  height?: number;
  /** MIME type such as `image/webp`. */
  mimeType?: string;
  size?: number;
}

/** Framework-neutral image metadata shared by Gatsby and Astro views. */
export interface MediaDescriptor {
  /** Public image URL used as the default source. */
  src: string;
  /** Alternative text presented to assistive technology. */
  alt: string;
  /** Intrinsic image dimensions in pixels. */
  width?: number;
  height?: number;
  /** MIME type such as `image/jpeg`. */
  mimeType?: string;
  /** Browser `srcSet` candidates in HTML source-set syntax. */
  srcSet?: string;
  /** Available named image encodings, such as WebP or AVIF. */
  formats?: Record<string, MediaFormat>;
  /** Optional CSS/background fallback for SSR and non-JavaScript rendering. */
  placeholder?: string;
}

/** Common identity, copy, rich-text, media, and date fields for published content. */
export interface ContentRecord {
  /** Stable CMS record identifier. */
  id: string;
  /** URL slug, or null when the CMS record has no slug. */
  slug: string | null;
  /** Required display title after adapter normalization. */
  title: string;
  description?: string;
  body?: JsonValue[];
  content?: JsonValue[];
  image?: MediaDescriptor;
  /** Optional CMS date text, commonly an ISO-like calendar date or timestamp. */
  date?: string | null;
}

/** Blog content with its optional display heading and archive thumbnail. */
export interface BlogRecord extends ContentRecord {
  heading?: string;
  thumbnail?: MediaDescriptor;
}

/** Condition content with stable archive ordering and an optional thumbnail. */
export interface ConditionRecord extends ContentRecord {
  heading?: string;
  order?: number | null;
  thumbnail?: MediaDescriptor;
}

/** Provider content, including optional credentials, retirement notice, and review. */
export interface ProviderRecord extends ContentRecord {
  order?: number | null;
  name?: {
    fullName?: string;
    honorific?: string;
    qualificationLong?: string;
    qualificationAbbr?: string;
  };
  retirementNotice?: { retired?: boolean; text?: JsonValue[] };
  review?: { text?: string; reviewer?: string; date?: string | null; link?: string };
}

/** Clinic content with nullable name and optional location, contact, and hours data. */
export interface ClinicRecord extends ContentRecord {
  clinicName: string | null;
  location?: {
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    placeId?: string;
    label?: string;
  };
  contact?: { phone?: string; fax?: string };
  hours?: Array<{
    day?: string;
    open?: boolean;
    openingHours?: { startTime?: string; endTime?: string };
    shotHours?: { startTime?: string; endTime?: string };
  }>;
}

/** A dated service update; its date is required for the published route. */
export interface ServiceUpdateRecord extends ContentRecord {
  date: string | null;
}

/** Public site metadata used to render titles and canonical URLs. */
export interface SiteSettings {
  title: string;
  url?: string;
  defaultImage?: MediaDescriptor;
}
