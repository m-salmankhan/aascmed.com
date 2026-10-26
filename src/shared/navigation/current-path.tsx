import React, { createContext, ReactNode, useContext } from "react";

const CurrentPathContext = createContext<string | null>(null);

/** Normalize a route to one leading and trailing slash.
 * @param path Browser or Gatsby pathname.
 * @returns A slash-delimited path; the site root remains `/`.
 */
export function normalizePath(path: string): string {
  if (path === "/") return path;
  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

/** Supply the route path so active links match during SSR and hydration.
 * @param props Provider path and optional React children.
 * @returns A context provider rendering the children with the normalized path.
 */
export const CurrentPathProvider: React.FC<{ path: string; children?: ReactNode }> = ({ path, children }) => (
  <CurrentPathContext.Provider value={normalizePath(path)}>{children}</CurrentPathContext.Provider>
);

/** Read the route path injected by the Gatsby boundary.
 * @returns The normalized path, or null when no provider is mounted.
 */
export const useCurrentPath = (): string | null => useContext(CurrentPathContext);
