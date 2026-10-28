const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const BRAND_PRIMARY = '#1C5E38';
const BRAND_SECONDARY = '#4DA249';

function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = (target) => https.get(target, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        if (!response.headers.location) return reject(new Error('Image redirect omitted its target'));
        request(new URL(response.headers.location, target).toString());
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
    request(url);
  });
}

function getMapboxStaticUrl(lat, lng, accessToken) {
  const marker = `pin-l+1C5E38(${lng},${lat})`;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${marker}/${lng},${lat},18/${OG_WIDTH}x${OG_HEIGHT}@2x?access_token=${encodeURIComponent(accessToken)}`;
}

async function downloadMapboxImage(lat, lng, outputPath) {
  const sharp = require('sharp');
  const accessToken = process.env.GATSBY_MAPBOX_API_KEY;
  if (!accessToken) throw new Error('GATSBY_MAPBOX_API_KEY environment variable is not set');
  const buffer = await downloadToBuffer(getMapboxStaticUrl(lat, lng, accessToken));
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(buffer).resize(OG_WIDTH, OG_HEIGHT).png().toFile(outputPath);
  return outputPath;
}

/** Gatsby compatibility adapter for the shared, deterministic social-card renderer. */
async function generateOGImage({ title, backgroundImagePath, outputPath }) {
  const { generateSocialCard } = await import('../astro/src/lib/public-images.ts');
  return generateSocialCard({ title: title || 'Untitled', backgroundImage: backgroundImagePath, outputPath });
}

async function initOGImageGenerator() {
  const { generateSocialCard } = await import('../astro/src/lib/public-images.ts');
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
