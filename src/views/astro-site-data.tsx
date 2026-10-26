import React, { type ReactNode } from "react";
import type { SiteData } from "../shared/data/site-data";
import { SiteDataProvider } from "../shared/data/site-data";
import { CurrentPathProvider } from "../shared/navigation/current-path";

const defaultSiteData: SiteData = {
  siteSettings: {
    title: "Allergy, Asthma and Sinus Centers",
    url: "https://www.aascmed.com",
    twitterHandle: "@DrMaazAllergy",
  },
  trackingSettings: { googleAnalyticsId: "", googleTagManagerId: "", pixelId: "" },
  announcement: { enabled: false, type: "info" },
  clinicOptions: [],
};

/** Supplies the site-wide data and current path that Gatsby used to provide around each page. */
export function AstroSiteDataProvider({
  children,
  pathname,
  siteData,
}: {
  children?: ReactNode;
  pathname: string;
  siteData?: Partial<SiteData>;
}) {
  const value: SiteData = {
    ...defaultSiteData,
    ...siteData,
    siteSettings: { ...defaultSiteData.siteSettings, ...siteData?.siteSettings },
    trackingSettings: { ...defaultSiteData.trackingSettings, ...siteData?.trackingSettings },
    announcement: { ...defaultSiteData.announcement, ...siteData?.announcement },
    clinicOptions: siteData?.clinicOptions ?? defaultSiteData.clinicOptions,
  };

  return (
    <CurrentPathProvider path={pathname}>
      <SiteDataProvider value={value}>{children}</SiteDataProvider>
    </CurrentPathProvider>
  );
}
