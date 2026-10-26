import React from "react";
import type { GatsbySSR } from "gatsby";
import GatsbySharedDataAdapter from "./src/adapters/gatsby/shared-data";
import { CurrentPathProvider } from "./src/shared/navigation/current-path";

export const wrapRootElement: GatsbySSR["wrapRootElement"] = ({ element }) => (
  <GatsbySharedDataAdapter>{element}</GatsbySharedDataAdapter>
);

export const wrapPageElement: GatsbySSR["wrapPageElement"] = ({ element, props }) => (
  <CurrentPathProvider path={props.location.pathname}>{element}</CurrentPathProvider>
);
