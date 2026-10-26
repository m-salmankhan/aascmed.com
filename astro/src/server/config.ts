/** Server-only settings. Do not import this module from a page or client component. */
export function getAstroServerConfig() {
  return {
    strapiApiUrl: process.env.ASTRO_STRAPI_API_URL,
    draftApiUrl: process.env.ASTRO_DRAFT_STRAPI_API_URL,
    draftPreviewUrl: process.env.ASTRO_DRAFT_API_URL,
    strapiToken: process.env.ASTRO_STRAPI_TOKEN,
  };
}
