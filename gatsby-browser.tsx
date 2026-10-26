import React from "react";
import type { GatsbyBrowser } from "gatsby";
import GatsbySiteDataAdapter from "./src/adapters/gatsby/site-data";
import GatsbyAnnouncementAdapter from "./src/adapters/gatsby/announcement";

/** Mount site settings and announcement data at the Gatsby browser boundary.
 * @param props Gatsby page element supplied by the browser API.
 * @returns The announcement banner and page element inside the site-data provider.
 */
export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = ({ element }) => (
  <GatsbySiteDataAdapter>
    <><GatsbyAnnouncementAdapter />{element}</>
  </GatsbySiteDataAdapter>
);
