// Gatsby compatibility adapter for clinic map downloads and shared social-card rendering.
const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');
/**
 * @import { generateSocialCard } from '../src/shared/media/social-cards.mjs'
 */
/** Existing Gatsby arguments translated to the shared renderer's card options.
 * @typedef {object} GatsbyCardOptions
 * @property {string} [title] Text rendered on the card; missing titles use a fallback.
 * @property {string} [backgroundImagePath] Gatsby's local background-image path.
 * @property {string} outputPath Destination for the generated JPEG.
 */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BRAND_PRIMARY = '#1C5E38';
const BRAND_SECONDARY = '#4DA249';
/** Download an HTTPS image into memory, following the source server's redirects.
 * @param {string} url Source image URL returned by the configured Mapbox endpoint.
 * @returns {Promise<Buffer>} Complete response bytes for Sharp to decode.
 */
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    /** Fetch a redirect target, recursively following HTTPS image redirects.
     * @param {string} target Current absolute image URL.
     * @returns {import("node:http").ClientRequest} Active request; response events settle the outer buffer promise.
     */
    const request = (target) => {
      return https
        .get(target, (response) => {
          if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
            response.resume();
            if (!response.headers.location) {
              return reject(new Error('Image redirect omitted its target'));
            }
            request(new URL(response.headers.location, target).toString());
            return;
          }
          if (response.statusCode !== 200) {
            response.resume();
            reject(
              new Error(`Failed to download image: ${response.statusCode}`),
            );
            return;
          }
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', reject);
    };
    request(url);
  });
}
/** Build the static-map URL for a clinic's coordinates.
 * @param {number} lat Clinic latitude in degrees.
 * @param {number} lng Clinic longitude in degrees.
 * @param {string} accessToken Public Mapbox token used only for the request.
 * @returns {string} Mapbox Static Images API URL.
 */
function getMapboxStaticUrl(lat, lng, accessToken) {
  const marker = `pin-l+1C5E38(${lng},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${marker}/${lng},${lat},18/${OG_WIDTH}x${OG_HEIGHT}@2x?access_token=${encodeURIComponent(accessToken)}`;
}
/** Download and resize one clinic map into the Gatsby build cache.
 * @param {number} lat Clinic latitude in degrees.
 * @param {number} lng Clinic longitude in degrees.
 * @param {string} outputPath Local destination for the map PNG.
 * @returns {Promise<string>} The path of the written map image.
 */
async function downloadMapboxImage(lat, lng, outputPath) {
  const sharp = require('sharp');
  const accessToken = process.env.GATSBY_MAPBOX_API_KEY;
  if (!accessToken) {
    throw new Error('GATSBY_MAPBOX_API_KEY environment variable is not set');
  }
  const buffer = await downloadToBuffer(
    getMapboxStaticUrl(lat, lng, accessToken),
  );
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(buffer).resize(OG_WIDTH, OG_HEIGHT).png().toFile(outputPath);
  return outputPath;
}
/** Preserve Gatsby's OG-generator call shape while delegating rendering to the shared implementation.
 * @param {GatsbyCardOptions} options Existing Gatsby title, local background path, and output path.
 * @returns Promise<string> The path written by the shared social-card renderer.
 */
async function generateOGImage({ title, backgroundImagePath, outputPath }) {
  const { generateSocialCard } = await import(
    '../src/shared/media/social-cards.mjs'
  );
  return generateSocialCard({
    title: title || 'Untitled',
    backgroundImage: backgroundImagePath,
    outputPath,
  });
}
/** Return the shared renderer for callers that still perform the former Gatsby warm-up step.
 * @returns {Promise<typeof generateSocialCard>} The social-card rendering function; loading it performs no image work.
 */
async function initOGImageGenerator() {
  const { generateSocialCard } = await import(
    '../src/shared/media/social-cards.mjs'
  );
  // Registration occurs on the first rendering request; this warm-up call is intentionally a no-op.
  return generateSocialCard;
}
module.exports = {
  generateOGImage,
  initOGImageGenerator,
  downloadMapboxImage,
  getMapboxStaticUrl,
  OG_WIDTH,
  OG_HEIGHT,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
};
