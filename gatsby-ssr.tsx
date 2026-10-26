import React from "react";
import type { GatsbySSR } from "gatsby";
import GatsbySharedDataAdapter from "./src/adapters/gatsby/shared-data";

export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => (
  <GatsbySharedDataAdapter>{element}</GatsbySharedDataAdapter>
);
