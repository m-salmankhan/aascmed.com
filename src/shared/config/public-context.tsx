import React, { createContext, useContext } from "react";
import { createPublicConfig, type PublicConfig } from "./public";

const PublicConfigContext = createContext<PublicConfig>(createPublicConfig());

/** Supply browser-safe runtime settings to a single React tree. */
export function PublicConfigProvider({ value, children }: { value: PublicConfig; children?: React.ReactNode }): React.ReactElement {
  return <PublicConfigContext.Provider value={value}>{children}</PublicConfigContext.Provider>;
}

/** Read the settings supplied by the current framework boundary. */
export function usePublicConfig(): PublicConfig {
  return useContext(PublicConfigContext);
}
