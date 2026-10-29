// Reads server-only Strapi connection and publication settings from the deployment environment.
import type { ContentMode } from "../../../src/shared/content/validation.ts";
/** Server-only CMS origin, credentials, and permitted publication mode. */
type AstroServerConfig = {
  strapiApiUrl: string | undefined;
  strapiToken: string | undefined;
  contentMode: ContentMode;
};
/** Read server-only Strapi settings from the deployment environment.
 * @returns The CMS origin, optional token, and published or draft deployment mode.
 */
export function getAstroServerConfig(): AstroServerConfig {
  return {
    strapiApiUrl: process.env.GATSBY_STRAPI_API_URL,
    strapiToken: process.env.STRAPI_TOKEN,
    contentMode: process.env.ASTRO_CONTENT_MODE === "draft" ? "draft" : "published",
  };
}
