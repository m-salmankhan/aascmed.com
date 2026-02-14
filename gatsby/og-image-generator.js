/**
 * OG Image Generator
 *
 * Generates Open Graph images with:
 * - Background image (or fallback gradient)
 * - Green gradient overlay (matching website hero)
 * - Icon logo at the top
 * - Title text that auto-sizes and truncates if needed (Poppins font)
 *
 * Uses sharp for image manipulation and @napi-rs/canvas for text rendering.
 */

const sharp = require('sharp');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');
const https = require('https');

// OG Image dimensions (recommended by Facebook/Twitter)
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// Brand colors (matching src/styles/theme.ts)
const BRAND_PRIMARY = '#1C5E38';
const BRAND_SECONDARY = '#4DA249';

// Layout constants
const PADDING = 60;
const LOGO_HEIGHT = 70; // Height for horizontal logo
const LOGO_TOP_MARGIN = 40;
const TITLE_TOP_MARGIN = 160; // Below logo (logo + margin)
const TITLE_BOTTOM_MARGIN = 60;
const MAX_TITLE_WIDTH = OG_WIDTH - PADDING * 2;

// Font settings
const FONT_FAMILY = 'Poppins';
const FALLBACK_FONT_FAMILY = 'sans-serif';
const MAX_FONT_SIZE = 64;
const MIN_FONT_SIZE = 36;
const FONT_SIZE_STEP = 4;
const MAX_LINES = 3; // Max lines before truncation
const MAX_CHARS = 100; // Hard limit for character count

// Poppins font URL (Google Fonts)
const POPPINS_BOLD_URL = 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf';
const FONTS_DIR = path.join(__dirname, '../.cache/fonts');
const POPPINS_BOLD_PATH = path.join(FONTS_DIR, 'Poppins-Bold.ttf');

let fontLoaded = false;

/**
 * Download Poppins font if not already cached
 */
async function ensurePoppinsFont() {
  if (fontLoaded) return true;

  // Create fonts directory
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }

  // Download if not exists
  if (!fs.existsSync(POPPINS_BOLD_PATH)) {
    console.log('Downloading Poppins Bold font...');
    try {
      await downloadFile(POPPINS_BOLD_URL, POPPINS_BOLD_PATH);
      console.log('Poppins Bold font downloaded successfully');
    } catch (error) {
      console.warn('Failed to download Poppins font, using fallback:', error.message);
      return false;
    }
  }

  // Register the font
  try {
    GlobalFonts.registerFromPath(POPPINS_BOLD_PATH, 'Poppins');
    fontLoaded = true;
    return true;
  } catch (error) {
    console.warn('Failed to register Poppins font:', error.message);
    return false;
  }
}

/**
 * Download a file from URL
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (followUrl) => {
      https.get(followUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          fs.unlink(dest, () => {});
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };
    request(url);
  });
}

/**
 * Download a file from URL to buffer (for Mapbox static images)
 */
function downloadToBuffer(url) {
  return new Promise((resolve, reject) => {
    const request = (followUrl) => {
      https.get(followUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject);
    };
    request(url);
  });
}

/**
 * Get Mapbox static image URL for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} accessToken - Mapbox access token
 * @returns {string} Mapbox static image URL
 */
function getMapboxStaticUrl(lat, lng, accessToken) {
  const zoom = 18;
  const width = OG_WIDTH;
  const height = OG_HEIGHT;
  const style = 'mapbox/satellite-streets-v12';
  const marker = `pin-l+1C5E38(${lng},${lat})`; // Large pin in brand color
  
  return `https://api.mapbox.com/styles/v1/${style}/static/${marker}/${lng},${lat},${zoom}/${width}x${height}@2x?access_token=${accessToken}`;
}

/**
 * Download Mapbox static image for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} outputPath - Where to save the image
 * @returns {Promise<string>} Path to the downloaded image
 */
async function downloadMapboxImage(lat, lng, outputPath) {
  const accessToken = process.env.GATSBY_MAPBOX_API_KEY;
  
  if (!accessToken) {
    throw new Error('GATSBY_MAPBOX_API_KEY environment variable is not set');
  }
  
  const url = getMapboxStaticUrl(lat, lng, accessToken);
  const buffer = await downloadToBuffer(url);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save the image (Mapbox returns @2x so resize to exact dimensions)
  await sharp(buffer)
    .resize(OG_WIDTH, OG_HEIGHT)
    .toFile(outputPath);
  
  return outputPath;
}

/**
 * Truncate title if too long (hard limit)
 * @param {string} title - Original title
 * @returns {string} Truncated title
 */
function truncateTitle(title) {
  if (title.length <= MAX_CHARS) return title;
  
  // Find last space before max chars to avoid cutting words
  let truncated = title.slice(0, MAX_CHARS);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > MAX_CHARS * 0.7) {
    truncated = truncated.slice(0, lastSpace);
  }
  return truncated.trim() + '...';
}

/**
 * Wrap text to fit within a maximum width
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} text - Text to wrap
 * @param {number} maxWidth - Maximum line width in pixels
 * @returns {string[]} Array of lines
 */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Calculate the best font size for the title that fits within constraints
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {string} title - Title text (already truncated if needed)
 * @param {number} maxWidth - Maximum width for text
 * @param {number} maxHeight - Maximum height for text block
 * @param {string} fontFamily - Font family to use
 * @returns {{ fontSize: number, lines: string[], truncated: boolean }}
 */
function calculateTitleLayout(ctx, title, maxWidth, maxHeight, fontFamily) {
  for (let fontSize = MAX_FONT_SIZE; fontSize >= MIN_FONT_SIZE; fontSize -= FONT_SIZE_STEP) {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const lineHeight = fontSize * 1.3;
    const lines = wrapText(ctx, title, maxWidth);

    // Check if it fits within max lines and height
    if (lines.length <= MAX_LINES) {
      const totalHeight = lines.length * lineHeight;
      if (totalHeight <= maxHeight) {
        return { fontSize, lines, truncated: false };
      }
    }
  }

  // If still doesn't fit, truncate lines at minimum font size
  const fontSize = MIN_FONT_SIZE;
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  let lines = wrapText(ctx, title, maxWidth);

  // Truncate to MAX_LINES and add ellipsis to last line
  if (lines.length > MAX_LINES) {
    lines = lines.slice(0, MAX_LINES);
    let lastLine = lines[MAX_LINES - 1];
    
    // Remove trailing ellipsis if title was already truncated
    if (lastLine.endsWith('...')) {
      lastLine = lastLine.slice(0, -3);
    }
    
    // Truncate last line to fit with ellipsis
    while (ctx.measureText(lastLine + '...').width > maxWidth && lastLine.length > 0) {
      lastLine = lastLine.slice(0, -1).trim();
    }
    lines[MAX_LINES - 1] = lastLine + '...';
  }

  return { fontSize, lines, truncated: true };
}

/**
 * Create the gradient overlay with logo and title
 * @param {string} title - Title text
 * @param {string} fontFamily - Font family to use
 * @returns {Promise<Buffer>} PNG buffer of the overlay
 */
async function createOverlay(title, fontFamily) {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Create gradient overlay (diagonal, top-left to bottom-right)
  // Use slightly lower opacity to reduce banding visibility
  const gradient = ctx.createLinearGradient(0, OG_HEIGHT, OG_WIDTH, 0);
  gradient.addColorStop(0.25, hexToRgba(BRAND_PRIMARY, 0.88));
  gradient.addColorStop(1, hexToRgba(BRAND_SECONDARY, 0.84));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // Add subtle noise to break up gradient banding
  const imageData = ctx.getImageData(0, 0, OG_WIDTH, OG_HEIGHT);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Add small random noise to RGB channels (±2)
    const noise = Math.floor(Math.random() * 5) - 2;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));     // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise)); // B
    // Alpha stays unchanged
  }
  ctx.putImageData(imageData, 0, 0);

  // Load and draw horizontal logo at top left
  // Use sharp to render SVG at correct size for crisp output
  if (fs.existsSync(HORIZONTAL_LOGO_SVG_PATH)) {
    try {
      // Get SVG metadata to calculate aspect ratio
      const svgBuffer = fs.readFileSync(HORIZONTAL_LOGO_SVG_PATH);
      const metadata = await sharp(svgBuffer).metadata();
      const aspectRatio = metadata.width / metadata.height;
      
      // Calculate dimensions
      const logoHeight = LOGO_HEIGHT;
      const logoWidth = Math.round(logoHeight * aspectRatio);
      
      // Render SVG to PNG at exact target size using sharp (crisp rendering)
      const logoPng = await sharp(svgBuffer)
        .resize(logoWidth, logoHeight, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      
      // Load the rendered PNG into canvas
      const logo = await loadImage(logoPng);
      ctx.drawImage(logo, PADDING, LOGO_TOP_MARGIN);
    } catch (error) {
      console.warn('Failed to load logo:', error.message);
    }
  }

  // Pre-truncate title if very long
  const truncatedTitle = truncateTitle(title);

  // Calculate available space for title
  const titleStartY = TITLE_TOP_MARGIN;
  const availableHeight = OG_HEIGHT - titleStartY - TITLE_BOTTOM_MARGIN;

  // Calculate title layout
  const { fontSize, lines } = calculateTitleLayout(
    ctx,
    truncatedTitle,
    MAX_TITLE_WIDTH,
    availableHeight,
    fontFamily
  );

  // Set up text styling
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const lineHeight = fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;

  // Center text vertically in available space
  const textStartY = titleStartY + (availableHeight - totalTextHeight) / 2;

  // Draw each line
  lines.forEach((line, index) => {
    const y = textStartY + index * lineHeight;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, PADDING, y);
  });

  return canvas.toBuffer('image/png');
}

/**
 * Convert hex color to rgba string
 * @param {string} hex - Hex color (e.g., '#1C5E38')
 * @param {number} alpha - Alpha value (0-1)
 * @returns {string} rgba string
 */
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Path to the horizontal logo SVG file
const HORIZONTAL_LOGO_SVG_PATH = path.join(__dirname, 'horizontal-logo.svg');

/**
 * Generate an OG image with title overlaid on a background
 *
 * @param {Object} options
 * @param {string} options.title - The title to display
 * @param {string} options.backgroundImagePath - Path to the background image (optional)
 * @param {string} options.outputPath - Where to save the generated image
 * @returns {Promise<string>} - Path to the generated image
 */
async function generateOGImage({ title, backgroundImagePath, outputPath }) {
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Try to load Poppins font
  const hasPoppins = await ensurePoppinsFont();
  const fontFamily = hasPoppins ? FONT_FAMILY : FALLBACK_FONT_FAMILY;

  let baseImage;

  if (backgroundImagePath && fs.existsSync(backgroundImagePath)) {
    // Use the provided background image, resize to OG dimensions
    baseImage = await sharp(backgroundImagePath)
      .resize(OG_WIDTH, OG_HEIGHT, {
        fit: 'cover',
        position: 'attention', // Use smart cropping to focus on interesting parts
      })
      .toBuffer();
  } else {
    // Create a solid color background as fallback (overlay will add gradient)
    baseImage = await sharp({
      create: {
        width: OG_WIDTH,
        height: OG_HEIGHT,
        channels: 4,
        background: { r: 28, g: 94, b: 56, alpha: 1 }, // BRAND_PRIMARY
      },
    })
      .png()
      .toBuffer();
  }

  // Create overlay with gradient, logo, and title
  const overlay = await createOverlay(title, fontFamily);

  // Composite the overlay on top of the base image
  // Use high-quality PNG settings to avoid banding/posterization
  await sharp(baseImage)
    .composite([
      {
        input: overlay,
        blend: 'over',
      },
    ])
    .png({ 
      compressionLevel: 6,
      palette: false, // Disable palette mode to preserve full color depth
    })
    .toFile(outputPath);

  return outputPath;
}

/**
 * Initialize the OG image generator (download fonts, etc.)
 * Call this before generating images in a batch.
 */
async function initOGImageGenerator() {
  await ensurePoppinsFont();
}

module.exports = {
  generateOGImage,
  initOGImageGenerator,
  downloadMapboxImage,
  // Export constants for testing/configuration
  OG_WIDTH,
  OG_HEIGHT,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
};
