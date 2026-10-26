/** Astro PUBLIC_ variables are safe for client-side use in both build targets. */
export const astroPublicConfig = {
  runtimeApiBaseUrl: import.meta.env.PUBLIC_RUNTIME_API_BASE_URL || "https://api.aascmed.com",
  mapboxAccessToken: import.meta.env.PUBLIC_MAPBOX_API_KEY || "",
};
