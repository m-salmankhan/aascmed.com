import React from "react";
import type { GatsbySSR } from "gatsby";
import GatsbySharedDataAdapter from "./src/adapters/gatsby/shared-data";

/** Apply the same shared data provider while Gatsby renders pages on the server. */
export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => (
  <GatsbySharedDataAdapter>{element}</GatsbySharedDataAdapter>
);
