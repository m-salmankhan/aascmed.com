import React from "react";
import type { GatsbyBrowser } from "gatsby";
import GatsbySharedDataAdapter from "./src/adapters/gatsby/shared-data";

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = ({ element }) => (
  <GatsbySharedDataAdapter>{element}</GatsbySharedDataAdapter>
);
