/** Browser-safe settings for non-content runtime APIs and the map display. */
export interface PublicConfig {
  /** Base URL for non-content runtime APIs, separate from Strapi content requests. */
  runtimeApiBaseUrl: string;
  mapboxAccessToken: string;
}

/** Build public settings from optional environment-backed values.
 * @param values Public runtime API base URL and map display key.
 * @returns Browser-safe settings with the default runtime API URL when absent.
 */
export function createPublicConfig(values: {
  runtimeApiBaseUrl?: string;
  mapboxAccessToken?: string;
} = {}): PublicConfig {
  return {
    runtimeApiBaseUrl: values.runtimeApiBaseUrl || "https://api.aascmed.com",
    mapboxAccessToken: values.mapboxAccessToken || "",
  };
}
