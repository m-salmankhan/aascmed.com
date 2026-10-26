import React, { createContext, ReactNode, useContext } from "react";

const CurrentPathContext = createContext<string | null>(null);

export function normalizePath(path: string): string {
  if (path === "/") return path;
  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

/** Supply the route path at the rendering boundary so active links match on SSR and hydration. */
export const CurrentPathProvider: React.FC<{ path: string; children?: ReactNode }> = ({ path, children }) => (
  <CurrentPathContext.Provider value={normalizePath(path)}>{children}</CurrentPathContext.Provider>
);

export const useCurrentPath = (): string | null => useContext(CurrentPathContext);
