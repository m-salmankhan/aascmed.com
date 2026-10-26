import React, { createContext, ReactNode, useContext } from "react";
import type { AnnouncementSettings, SiteSettings, TrackingSettings } from "../content/models";

/** Framework-neutral global values needed by shared site components. */
export interface SiteData {
  siteSettings: SiteSettings;
  trackingSettings: TrackingSettings;
  announcement: AnnouncementSettings;
  clinicOptions: string[];
}

const defaultSiteData: SiteData = {
  siteSettings: { title: "Untitled Site", url: "" },
  trackingSettings: { googleAnalyticsId: "", googleTagManagerId: "", pixelId: "" },
  announcement: { enabled: false, type: "info" },
  clinicOptions: [],
};

const SiteDataContext = createContext<SiteData>(defaultSiteData);

/** Provide framework data to components in one React tree. Each Astro island needs its own provider. */
export const SiteDataProvider: React.FC<{ value: SiteData; children?: ReactNode }> = ({ value, children }) => (
  <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>
);

/** Read the site data supplied by the nearest framework adapter provider. */
export const useSiteData = (): SiteData => useContext(SiteDataContext);
