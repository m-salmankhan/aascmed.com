import React from "react";
import type { GatsbyBrowser } from "gatsby";
import GatsbySharedDataAdapter from "./src/adapters/gatsby/shared-data";

/** Wrap every Gatsby browser page with the shared query-data provider.
 * @param props Gatsby page element supplied by the browser API.
 * @returns The element inside the shared-data provider.
 */
export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = ({ element }) => (
  <GatsbySharedDataAdapter>{element}</GatsbySharedDataAdapter>
);
