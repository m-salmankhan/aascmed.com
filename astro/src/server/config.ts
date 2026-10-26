/** Return server-only settings used by the Stage 1 Strapi proof.
 * @returns The full draft resource URL and its server-side token; do not expose these to client code.
 */
export function getAstroServerConfig() {
  return {
    /** Full Strapi REST resource used only by the Stage 1 proof; it is not a CMS base URL. */
    draftResourceUrl: process.env.ASTRO_DRAFT_API_URL,
    /** Server-only credential used by the Stage 1 Strapi request. */
    strapiToken: process.env.ASTRO_STRAPI_TOKEN,
  };
}
