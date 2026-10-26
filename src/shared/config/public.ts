/** Values that are safe to compile into browser JavaScript. */
export interface PublicConfig {
  apiBaseUrl: string;
  mapboxAccessToken: string;
}

export function createPublicConfig(values: {
  apiBaseUrl?: string;
  mapboxAccessToken?: string;
} = {}): PublicConfig {
  return {
    apiBaseUrl: values.apiBaseUrl || "https://api.aascmed.com",
    mapboxAccessToken: values.mapboxAccessToken || "",
  };
}
