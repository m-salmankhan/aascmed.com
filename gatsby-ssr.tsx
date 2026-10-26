import React from "react";
import type { GatsbySSR } from "gatsby";
import GatsbySharedDataAdapter from "./src/adapters/gatsby/shared-data";

/** Apply the shared-data provider while Gatsby renders pages on the server.
 * @param props Gatsby page element supplied by the SSR API.
 * @returns The element inside the shared-data provider.
 */
export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => (
  <GatsbySharedDataAdapter>{element}</GatsbySharedDataAdapter>
);
