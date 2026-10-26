import React from "react";
import type { ClinicRecord, ContentPageRecord, ServiceUpdateRecord } from "../shared/content/models";
import type { SiteData } from "../shared/data/site-data";
import type { PracticeSummary } from "../components/practices/practice-archive";
import { ClinicsArchiveView, ServiceUpdatesArchiveView } from "./fixed-archive";
import { ClinicView } from "./clinic";
import { ServiceUpdateView } from "./service-update";
import { AstroSiteDataProvider } from "./astro-site-data";

type WithSiteData = { pathname: string; siteData: SiteData };

export function AstroClinicsArchivePage(props: WithSiteData & {
  heading: string;
  blocks?: ContentPageRecord["text"];
  practices: PracticeSummary[];
}) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ClinicsArchiveView heading={props.heading} blocks={props.blocks} practices={props.practices} />
  </AstroSiteDataProvider>;
}

export function AstroServiceUpdatesArchivePage(props: WithSiteData & {
  heading: string;
  blocks?: ContentPageRecord["text"];
  serviceUpdates: Array<{ slug: string; date: string; title: string; description: string }>;
}) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ServiceUpdatesArchiveView heading={props.heading} blocks={props.blocks} serviceUpdates={props.serviceUpdates} />
  </AstroSiteDataProvider>;
}

export function AstroClinicPage(props: WithSiteData & { clinic: ClinicRecord; mapboxAccessToken?: string }) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ClinicView clinic={props.clinic} mapboxAccessToken={props.mapboxAccessToken} />
  </AstroSiteDataProvider>;
}

export function AstroServiceUpdatePage(props: WithSiteData & { serviceUpdate: ServiceUpdateRecord }) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ServiceUpdateView serviceUpdate={props.serviceUpdate} pathname={props.pathname} />
  </AstroSiteDataProvider>;
}
