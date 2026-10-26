import React from "react";
import type { GatsbyBrowser } from "gatsby";
import GatsbySharedDataAdapter from "./src/adapters/gatsby/shared-data";
import { CurrentPathProvider } from "./src/shared/navigation/current-path";

export const wrapRootElement: GatsbyBrowser["wrapRootElement"] = ({ element }) => (
  <GatsbySharedDataAdapter>{element}</GatsbySharedDataAdapter>
);

export const wrapPageElement: GatsbyBrowser["wrapPageElement"] = ({ element, props }) => (
  <CurrentPathProvider path={props.location.pathname}>{element}</CurrentPathProvider>
);
