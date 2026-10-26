/** Values that can cross a framework boundary as plain JSON data. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Strapi Blocks nodes and dynamic-zone entries stay data; views create React elements. */
export type ContentBlock = { [key: string]: JsonValue };
export type DynamicZoneItem = { __component: string; [key: string]: JsonValue };

export interface MediaFormat {
  type: string;
  srcSet: string;
  sizes?: string;
}

/** Framework-neutral replacement for Gatsby's localFile/GatsbyImageData tree. */
export interface MediaDescriptor {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  mimeType?: string;
  srcSet?: string;
  /** Browser slot size copied from Gatsby's image data when available. */
  sizes?: string;
  /** Candidate widths and URLs for renderers that need a responsive source set. */
  sources?: Array<{ src: string; width: number }>;
  /** Preserve source aspect ratio when a layout needs an explicit box. */
  aspectRatio?: number;
  /** A stable content URL for video and other non-image media. */
  poster?: string;
  /** Alternate encodings for a picture element, such as AVIF/WebP. */
  formats?: MediaFormat[];
  /** Optional CSS/background fallback for SSR and non-JavaScript rendering. */
  placeholder?: string;
}

export interface ContentRecord {
  /** Strapi v5 stable identity. Gatsby adapters may omit it during migration. */
  documentId?: string;
  id: string;
  slug: string | null;
  title: string;
  description?: string;
  body?: JsonValue[];
  content?: JsonValue[];
  image?: MediaDescriptor;
  date?: string | null;
}

export interface BlogRecord extends ContentRecord {
  heading?: string;
  thumbnail?: MediaDescriptor;
}

export interface ConditionRecord extends ContentRecord {
  heading?: string;
  order?: number | null;
  thumbnail?: MediaDescriptor;
}

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

export interface ServiceUpdateRecord extends ContentRecord {
  date: string | null;
}

export interface ReviewRecord {
  documentId?: string;
  id: string;
  name: string;
  stars?: number;
  content?: JsonValue[];
  sourceName?: string;
  sourceUrl?: string;
}

/** Normalized singleton page fields shared by archive and fixed page views. */
export interface ContentPageRecord {
  documentId: string;
  id: string;
  heading?: string;
  title?: string;
  description?: string;
  metaDescription?: string;
  text?: JsonValue[];
}

export interface HomePageRecord {
  documentId: string;
  id: string;
  metaDescription?: string;
  hero?: JsonValue;
  genericBelowHero?: JsonValue;
  conditions?: JsonValue;
  serviceUpdates?: JsonValue;
  blog?: JsonValue;
  providers?: JsonValue;
  feedback?: JsonValue;
  locations?: JsonValue;
  contact?: JsonValue;
}

export interface SiteSettings {
  title: string;
  url?: string;
  twitterHandle?: string;
  defaultImage?: MediaDescriptor;
}

export interface TrackingSettings {
  googleAnalyticsId: string;
  googleTagManagerId: string;
  pixelId: string;
}

export interface AnnouncementSettings {
  enabled: boolean;
  type: "error" | "info" | "success";
  message?: JsonValue[];
}
