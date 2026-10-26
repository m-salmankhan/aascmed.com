/** Browser-safe settings; the contact backend is separate from the Strapi CMS. */
export interface PublicConfig {
  /** Base URL for contact-form submissions, not the Strapi API. */
  contactApiBaseUrl: string;
  mapboxAccessToken: string;
}

/** Build public settings from optional environment-backed values.
 * @param values Public contact backend URL and map display key.
 * @returns Browser-safe settings with the default contact backend URL when absent.
 */
export function createPublicConfig(values: {
  contactApiBaseUrl?: string;
  mapboxAccessToken?: string;
} = {}): PublicConfig {
  return {
    contactApiBaseUrl: values.contactApiBaseUrl || "https://api.aascmed.com",
    mapboxAccessToken: values.mapboxAccessToken || "",
  };
}
