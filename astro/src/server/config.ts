/** Server-only settings. Do not import this module from a page or client component. */
export function getAstroServerConfig() {
  return {
    strapiApiUrl: process.env.GATSBY_STRAPI_API_URL,
    strapiToken: process.env.STRAPI_TOKEN,
    contentMode: process.env.ASTRO_CONTENT_MODE === "draft" ? "draft" : "published",
  };
}
