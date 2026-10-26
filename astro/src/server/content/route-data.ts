import type { SiteSettings, TrackingSettings } from "../../../../src/shared/content/models.ts";
import type { SiteData } from "../../../../src/shared/data/site-data.tsx";
import { getAnnouncement, getClinics, getPublishedBuildSnapshot, getTrackingInfo } from "./loaders.ts";
import type { ContentMode } from "./strapi.ts";

/** The site settings are Gatsby site metadata today; keep their values at the Astro boundary. */
const siteSettings: SiteSettings = {
  title: "Allergy, Asthma and Sinus Centers",
  url: "https://www.aascmed.com",
  twitterHandle: "@DrMaazAllergy",
};

const emptyTracking: TrackingSettings = { googleAnalyticsId: "", googleTagManagerId: "", pixelId: "" };

/** Resolve the shared React context for one Astro page render. Draft data is request scoped in SSR. */
export async function getAstroSiteData(mode: ContentMode, includeClinicOptions = false): Promise<SiteData> {
  const clinicsPromise = includeClinicOptions
    ? mode === "published"
      ? getPublishedBuildSnapshot().then((snapshot) => snapshot.clinics)
      : getClinics(mode)
    : Promise.resolve([]);
  const [announcement, tracking, clinics] = await Promise.all([
    getAnnouncement(mode),
    getTrackingInfo(mode),
    clinicsPromise,
  ]);

  return {
    siteSettings,
    trackingSettings: tracking ?? emptyTracking,
    announcement: announcement ?? { enabled: false, type: "info" },
    clinicOptions: clinics.flatMap((clinic) => clinic.clinicName ? [clinic.clinicName] : []),
  };
}

export function getRouteContentMode(): ContentMode {
  return import.meta.env.PUBLIC_ASTRO_TARGET === "static" ? "published" : "draft";
}

export function isAstroPreview(): boolean {
  return import.meta.env.PUBLIC_ASTRO_TARGET !== "static";
}
