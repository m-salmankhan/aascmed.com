import { createPublicConfig } from "../shared/config/public";

/** Gatsby-prefixed values are intentionally public and may appear in the client bundle. */
export const gatsbyPublicConfig = createPublicConfig({
  contactApiBaseUrl: process.env.GATSBY_API_BASE_URL,
  mapboxAccessToken: process.env.GATSBY_MAPBOX_API_KEY,
});
