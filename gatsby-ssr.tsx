import React from "react";
import type { GatsbySSR } from "gatsby";
import GatsbySiteDataAdapter from "./src/adapters/gatsby/site-data";
import GatsbyAnnouncementAdapter from "./src/adapters/gatsby/announcement";
import { CurrentPathProvider } from "./src/shared/navigation/current-path";

/** Mount site settings and announcement data while Gatsby renders pages on the server.
 * @param props Gatsby page element supplied by the SSR API.
 * @returns The announcement banner and page element inside the site-data provider.
 */
export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => (
  <GatsbySiteDataAdapter>
    <><GatsbyAnnouncementAdapter />{element}</>
  </GatsbySiteDataAdapter>
);

/** Provide the current route during SSR so active links match hydrated markup.
 * @param props Gatsby page element and location pathname.
 * @returns The page element wrapped in the current-path provider.
 */
export const wrapPageElement: GatsbySSR["wrapPageElement"] = ({ element, props }) => (
  <CurrentPathProvider path={props.location.pathname}>{element}</CurrentPathProvider>
);
