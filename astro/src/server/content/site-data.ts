import type { SiteData } from "../../../../src/shared/data/site-data.tsx";
import { getAnnouncement, getTrackingInfo } from "./loaders.ts";
import type { ContentMode } from "./strapi.ts";

/** The Gatsby root wrappers supplied these settings to every React page tree. */
export async function getPageSiteData(mode: ContentMode): Promise<SiteData> {
  const [announcement, trackingSettings] = await Promise.all([
    getAnnouncement(mode),
    getTrackingInfo(mode),
  ]);

  return {
    siteSettings: {
      title: "Allergy, Asthma and Sinus Centers",
      url: "https://www.aascmed.com",
      twitterHandle: "@DrMaazAllergy",
    },
    trackingSettings: trackingSettings ?? {
      googleAnalyticsId: "", googleTagManagerId: "", pixelId: "",
    },
    announcement: announcement ?? { enabled: false, type: "info" },
    clinicOptions: [],
  };
}
