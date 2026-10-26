/** Server-only settings. Do not import this module from a page or client component. */
export function getAstroServerConfig() {
  return {
    draftApiUrl: process.env.ASTRO_DRAFT_API_URL,
    strapiToken: process.env.ASTRO_STRAPI_TOKEN,
  };
}
