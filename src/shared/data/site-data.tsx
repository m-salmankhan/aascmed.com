import React, { createContext, ReactNode, useContext } from "react";
import type { SiteSettings } from "../content/models";

/** Framework-neutral site metadata needed by shared site components. */
export interface SiteData {
  /** Public title, URL, and optional social/media metadata. */
  siteSettings: SiteSettings;
}

const defaultSiteData: SiteData = {
  siteSettings: { title: "Untitled Site", url: "" },
};

const SiteDataContext = createContext<SiteData>(defaultSiteData);

/** Provide shared site data to one React tree; each independent Astro island needs a provider.
 * @param props Normalized site values and optional React children.
 * @returns The children inside the site-data context provider.
 */
export function SiteDataProvider(props: { value: SiteData; children?: ReactNode }): React.ReactElement {
  return <SiteDataContext.Provider value={props.value}>{props.children}</SiteDataContext.Provider>;
}

/** Read shared site data from the nearest provider.
 * @returns Shared site metadata.
 */
export const useSiteData = (): SiteData => useContext(SiteDataContext);
