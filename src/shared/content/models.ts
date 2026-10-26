/** Values that can cross a framework boundary as plain JSON data. */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Strapi Blocks nodes and dynamic-zone entries stay data; views create React elements. */
export type ContentBlock = { [key: string]: JsonValue };
export type DynamicZoneItem = { __component: string; [key: string]: JsonValue };

export interface MediaFormat {
  src: string;
  width?: number;
  height?: number;
  mimeType?: string;
  size?: number;
}

/** Framework-neutral replacement for Gatsby's localFile/GatsbyImageData tree. */
export interface MediaDescriptor {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  mimeType?: string;
  srcSet?: string;
  formats?: Record<string, MediaFormat>;
  /** Optional CSS/background fallback for SSR and non-JavaScript rendering. */
  placeholder?: string;
}

export interface ContentRecord {
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
