import React, { createContext, ReactNode, useContext } from "react";
import type { AnnouncementSettings, SiteSettings, TrackingSettings } from "../content/models";

/** Framework-neutral global values needed by shared site components. */
export interface SiteData {
  /** Public title, URL, and optional social/media metadata. */
  siteSettings: SiteSettings;
  /** Analytics identifiers, represented as strings even when unconfigured. */
  trackingSettings: TrackingSettings;
  /** Normalized banner state and optional rich-text content. */
  announcement: AnnouncementSettings;
  /** Nonempty clinic names available to the contact form selector. */
  clinicOptions: string[];
}

const defaultSiteData: SiteData = {
  siteSettings: { title: "Untitled Site", url: "" },
  trackingSettings: { googleAnalyticsId: "", googleTagManagerId: "", pixelId: "" },
  announcement: { enabled: false, type: "info" },
  clinicOptions: [],
};

const SiteDataContext = createContext<SiteData>(defaultSiteData);

/** Provide shared site data to one React tree; each independent Astro island needs a provider.
 * @param props Normalized site values and optional React children.
 * @returns The children inside the site-data context provider.
 */
export const SiteDataProvider: React.FC<{ value: SiteData; children?: ReactNode }> = ({ value, children }) => (
  <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>
);

/** Read shared site data from the nearest provider.
 * @returns Site settings, tracking IDs, announcement, and clinic options.
 */
export const useSiteData = (): SiteData => useContext(SiteDataContext);
