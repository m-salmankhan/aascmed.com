import React from "react";
import type { SiteData } from "../shared/data/site-data";
import type { ContentPageRecord } from "../shared/content/models";
import { ContactView, NotFoundView, PrivacyView } from "./fixed-archive";
import type { PracticeSummary } from "../components/practices/practice-archive";
import { AstroSiteDataProvider } from "./astro-site-data";

export function AstroPrivacyPage({ page, siteData, pathname }: { page: ContentPageRecord | null; siteData: SiteData; pathname: string }) {
  const lastUpdated = page?.updatedAt
    ? new Date(page.updatedAt).toISOString().slice(0, 10).replace(/-/g, ".")
    : undefined;
  return <AstroSiteDataProvider pathname={pathname} siteData={siteData}>
    <PrivacyView heading={page?.title || "Privacy Policy"} blocks={page?.text} lastUpdated={lastUpdated} />
  </AstroSiteDataProvider>;
}

export function AstroContactPage({ page, practices, siteData, pathname }: {
  page: ContentPageRecord | null;
  practices: PracticeSummary[];
  siteData: SiteData;
  pathname: string;
}) {
  return <AstroSiteDataProvider pathname={pathname} siteData={siteData}>
    <ContactView heading={page?.heading || "Contact Us"} blocks={page?.text} practices={practices} />
  </AstroSiteDataProvider>;
}

export function AstroNotFoundPage({ siteData, pathname }: { siteData: SiteData; pathname: string }) {
  return <AstroSiteDataProvider pathname={pathname} siteData={siteData}><NotFoundView /></AstroSiteDataProvider>;
}
