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
const ICON_SIZE = 140; // Larger icon at top
const ICON_TOP_MARGIN = 40;
const TITLE_TOP_MARGIN = 200; // Below icon
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
 * Create the gradient overlay with icon and title
 * @param {string} title - Title text
 * @param {string} iconPath - Path to icon PNG (pre-rendered from SVG)
 * @param {string} fontFamily - Font family to use
 * @returns {Promise<Buffer>} PNG buffer of the overlay
 */
async function createOverlay(title, iconPath, fontFamily) {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  // Create gradient overlay (horizontal, matching website hero)
  const gradient = ctx.createLinearGradient(0, 0, OG_WIDTH, 0);
  gradient.addColorStop(0, hexToRgba(BRAND_PRIMARY, 0.9));
  gradient.addColorStop(1, hexToRgba(BRAND_SECONDARY, 0.85));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  // Load and draw icon at top (centered)
  if (iconPath && fs.existsSync(iconPath)) {
    try {
      const icon = await loadImage(iconPath);
      const aspectRatio = icon.width / icon.height;
      const iconHeight = ICON_SIZE;
      const iconWidth = iconHeight * aspectRatio;

      // Center icon horizontally
      const iconX = (OG_WIDTH - iconWidth) / 2;
      ctx.drawImage(icon, iconX, ICON_TOP_MARGIN, iconWidth, iconHeight);
    } catch (error) {
      console.warn('Failed to load icon:', error.message);
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
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const lineHeight = fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;

  // Center text vertically in available space
  const textStartY = titleStartY + (availableHeight - totalTextHeight) / 2;

  // Draw each line with shadow for depth
  lines.forEach((line, index) => {
    const y = textStartY + index * lineHeight;

    // Text shadow (multiple layers for better depth)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillText(line, OG_WIDTH / 2 + 3, y + 3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillText(line, OG_WIDTH / 2 + 1, y + 1);

    // Main text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(line, OG_WIDTH / 2, y);
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

/**
 * Render the icon from SVG to PNG
 * @param {number} size - Desired size (width and height)
 * @returns {Promise<string>} Path to the rendered PNG
 */
async function renderIconFromSvg(size = ICON_SIZE) {
  const iconPngPath = path.join(FONTS_DIR, `icon-${size}.png`);

  // Return cached version if exists
  if (fs.existsSync(iconPngPath)) {
    return iconPngPath;
  }

  // Ensure directory exists
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }

  // The icon SVG data (extracted from logo-sprites.svg, viewBox="15 0 375 410")
  const iconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="15 0 375 410" width="${size}" height="${size}">
  <g fill="#FFFFFF">
    <path d="M0 204.7C-0.2 92.5 91 0.7 203.5 0c113.1-0.7 205.3 91.2 205.5 204.6 0.2 113.8-93.5 204.2-204.2 204.5C92.2 409.4 0.2 317.7 0 204.7zM18.5 155.9c-0.3 0.6-0.6 1.3-0.9 1.9 -0.5 2.3-0.9 4.7-1.4 7 -0.9 4.7-1.8 9.4-2.6 14.2 -0.4 5.1-0.7 10.2-1.1 15.2 -1.9 19.9 7.5 36.6 15.4 53.7 2.4 8.7 7.5 16 12.3 23.4 16.2 24.7 36.7 44.7 65 55.3 23.2 8.7 47.5 3.3 58.1-14 12.9-21 13.4-43.8 5.5-66.7 -6.8-19.6-39.4-30.3-55.3-10.7 -6.1 7.6-13.8 13.9-20.7 20.9 -2.7 2.8-5.9 4.4-9.2 1.8 -3.5-2.7-2.4-6 0.1-9.1 1.3-1.5 3.7-2.8 2.1-6.1 -1.6 0.1-3.4 0.2-5.2 0.3 -3.9 0.3-7.2-0.7-7.6-5.1 -0.4-4.5 2.7-6 6.6-6.3 3.1-0.2 6.3-0.6 9.4-0.3 8.6 0.7 22.2-5.8 26.1-12.7 0.6-1.2 0.8-2-0.2-3.3 -4.7-5.6-21.1-5.6-25.3 0.4 -4.7 6.8-11.2 11.1-18.7 14.1 -2.9 1.2-5.7 0.7-7.3-2.5 -1.6-3.1-0.5-5.6 2.2-7.4 2.6-1.7 5.5-3.1 8.1-4.9 2.2-1.6 5.9-2.9 4.8-6.2 -0.8-2.5-4.4-1.9-6.7-2.1 -6.9-0.7-11.4-2.7-7.4-10.7 1.6-0.6 4.4 0.2 4.4-2.1 0.1-2.3-2.7-3-4.3-4.2 -0.1-1.7-0.2-3.3-0.3-5 6.2-4.5 10.7-0.8 14.8 3.4 8.3 8.4 16.8 15.5 30 14 6.3-0.7 12.5 2.2 17 7 3.6 3.8 7.7 4.6 12.7 4.8 20.2 0.7 35.4 12.3 42 31.4 5.3 15.4 5.2 31.3 2.3 47 -6.7 36.3-31.3 54.3-67.8 48.5 -29.5-4.7-51.9-22.3-70.7-44.7 -6.9-8.3-13.2-17.1-19.8-25.7 8 26.4 23 48.1 40.8 68.5 15 17.2 33.1 23.8 55.3 23.7 34.9-0.1 57.2-16.1 65.4-50.2 7.1-29.6 4.9-59.2-5.2-87.9 -5.5-15.7-13.1-30.3-25.9-41.5 -4-3.5-8.4-8.4-14-6.7 -10.2 3.1-24.2-2.2-29.5 12.9 -0.9 2.5-4.4 3.6-7.4 1.6 -2.5-1.6-3-3.8-2.3-6.6 2.4-9.1-0.5-12.8-10.3-12.2 -8 0.4-15.8 0.1-23.7-0.8 -5.3-8.2-4.4-9.9 5.7-11.4 4.5 1 10.1 3.6 12.8-0.8 1.9-3.1-2.9-6.9-5.3-10 -1.3-1.7-2.4-3.6-3.5-5.5l0.3-0.5c9.9-13.1 14.3 7.9 23 3.8 1.9-0.9 3.1 1.6 3.3 3.7 0.1 0.9 0.1 2-0.2 2.8 -3.9 8.7 1.3 11.3 8.3 12.9 6.9 1.6 13.8 1.4 20.7 0.1 3.5-0.7 4.9-1.9 3.8-5.7 -2.5-9.3-6.2-18-13.5-24.6 -3-2.7-6.3-5.8-10.9-3.9 -12.1 4.8-23.6 1.5-35.1-2.5 -0.7-1.3-1.3-2.6-2-3.9 0.2-1.2 0.4-2.3 0.7-3.5 1.1-0.9 2.2-1.8 3.3-2.7 5.2 1 10.4 2.1 15.7 3.1 2.8 0.5 6.1 1.6 8-0.8 1.9-2.4-1.4-4.3-2.4-6.4 -1.5-3.1-2.5-6.2 0.7-8.5 3.4-2.4 6.4-1.2 8.9 2.1 3.1 3.9 4.9 9.3 9.7 11.3 16.5 7 23.2 21.2 28.1 37 1.1 3.6 0.2 8.6 5.6 9.9 0.3 0.4 0.8 0.6 1.3 0.6 17.9 13.2 28.8 31.3 36.5 51.7 9.9 26.3 10.7 53.6 9.2 81.1l-0.1 0.6 0.6 0.2c-0.4 1-0.8 2-1.2 2.9 -0.1 1.3-0.3 2.6-0.4 3.9 -3.6 14.2-8.4 28-17.2 40 -1 1.1-2 2.3-3 3.4 -7.6 7.4-16.5 12.7-25.9 17.4 -3.9 1-7.8 2-11.6 3.1 -8.8 0.6-17.6 1.3-29.2 2.1 15.3 7.7 28.2 13.8 42.5 16.2l-0.1-0.2c0.7 0.4 1.4 0.7 2.1 1.1 1.3 0.2 2.7 0.4 4 0.7 2.9 1.7 6.2 2.2 9.5 2l0.5 0.3 0.5-0.2c0.9 0.3 1.7 0.6 2.6 0.8 4.7 1.1 9.5 1.7 14.4 1.1 1.4 1.2 3 1.3 4.7 1 1.4 0 2.7 0 4.1 0.1l0.9 0.2 0.9-0.1c3.9 0 7.7 0 11.6-0.1 12.9-0.1 25.6-1.3 38-5.2 1.3-0.2 2.6-0.4 3.9-0.7 0.8-0.3 1.5-0.6 2.3-1 1.8-0.5 3.6-1 5.5-1.5 11.4-2.6 21.8-7.3 32-14 -24.5-0.7-46.3-7.2-63.1-25.6l-0.4-0.6c-2.8-4.2-5.6-8.4-8.3-12.6 -1-2.3-2-4.6-2.9-6.9 -0.4-0.7-0.8-1.4-1.2-2.2 -1.3-4.3-2.6-8.7-3.9-13 -2.3-16-3.8-32-2.3-48.2 3.6-39.5 13.6-75.8 49.1-99.6 1.2-0.8 2.2-2.5 2.3-3.9 2.7-28.5 28.9-38.8 44.3-57.5 1.8 0.8 3.5 1.6 5.3 2.3 2.4 6-3.2 9.7-4.8 14.9 6 2 11 1.7 16.3-1.5 3.3-2 7.8-2.1 9.5 2.7 1.5 4.2-1.5 6.6-5.1 7.7 -7.6 2.4-15.7 5.5-23.2 2.8 -11.8-4.4-18 1.5-23 10.2 -3.7 6.4-10.3 14.8-5.9 20.5 4.6 5.9 14.7 3 22.5 1.3 7.2-1.6 10.8-4.8 6.8-12.6 -2.3-4.5-0.5-9.7 4.6-8.3 5.8 1.5 7.9-1.4 11.1-4.2 2.6-2.3 5.7-3 8.5-0.4 3.1 2.8 1.8 5.6-0.4 8.3 -1 1.2-2.2 2.4-3 3.7 -1.5 2.3-4.4 4.9-2.7 7.4 0.9 1.4 4.7 1 7.1 1.2 1.6 0.1 3.2-0.2 4.7-0.5 4.3-0.7 8.9-1 9.4 4.8 0.5 5.6-4.4 6-8.5 6.7 -6.3 1.1-12.6 0.3-18.9-0.1 -7.8-0.4-13.3 4.5-11 9.3 1.8 3.7 3.8 7.3-0.7 9.7 -5.5 2.9-7.8-1.7-10.4-5.3 -1.6-2.2-1.2-5.3-4.7-6.6 -19.3-6.7-30.7-2.8-43.1 15 -1.2 1.8-2.4 3.6-3.6 5.4 -24.1 38.7-28.6 80.5-14.6 123 13.5 41.3 71.9 54.8 104.9 26.3 15.4-13.3 27.7-29.2 37.8-46.7 2.1-3.7 5.5-6.9 5-13.1 -3.8 4.5-6.8 8.1-9.8 11.6 -20.7 23.9-45.5 40.1-78.3 41.2 -20.3 0.6-37.6-4.1-50.3-22.1 -11.8-16.7-13.9-34.9-13-54.1 1.1-22.9 10.3-40.9 32.8-50 6.1-0.8 12.2-1.5 18.3-2.3 6.7-0.8 9.6-8.1 15.8-9.5 16.5-3.6 33-6.8 44.1-21.6 1.9-2.5 5.9-2.5 8.3 0.6 2.1 2.6 1.4 5.3-0.8 7.7 -1.2 1.3-4.2 1.8-1.5 5 6.6 7.8 5.9 9.3-3.8 11.3 -2.6 0.5-5.7-0.2-7.8 2.5 2.3 6.1 8.2 7.6 12.8 10.6 3.2 2.1 4.3 4.9 2.5 8 -1.6 2.8-4.5 3.2-7.5 1.9 -6.2-2.6-11.9-6-16.2-11.3 -6.7-8.2-17.5-9.7-26.1-3.8 -2.3 1.5-3.6 2.7-0.7 4.8 8.4 6.2 14.3 17.1 28.3 12.2 4.9-1.7 13.5-1.7 13.4 8.4 -0.7 0.8-1.3 1.6-2 2.4 -4 2.3-8.9-1.5-13.4 1.4 3.4 4.9 9.2 8.4 4.9 14.9 -2.3 0.1-4.6 0.2-6.9 0.4 -8.2-8.3-16.5-16.5-24.7-24.9 -6.4-6.5-14-9.3-23.1-8.4 -0.5-0.3-1-0.2-1.5 0.2 -21.5 1.5-33.6 16.7-34 42.7 0.1 4.5 0.2 9 0.3 13.4 0.3 1.6 0.7 3.1 1 4.7 0.1 1.6 0.3 3.1 0.4 4.7 3.7 22.5 15.6 35.6 36.9 38.4 23.4 3.1 44.6-3 63.2-18 28.9-23.2 45.5-54.5 58.3-88.2 1.5-3.9 1.4-8.1 0.8-12.2 0.9-7 0.6-13.9-0.3-20.9 -3.3-43.6-18.7-82-48.8-114.1l-0.2-0.2c-9.9-12.5-22-22.6-35.5-31.1l0.1 0.1c-20.2-14.4-42.4-24.3-67-28.6 -23.5-5.8-47.2-6.5-71-2.2 -0.8 0.2-1.6 0.5-2.4 0.7 -3.1 0-6.2-0.1-9 1.7 -12.7 1.8-24.8 5.7-36.2 11.7 -1.2 0.6-2.5 1.2-3.7 1.8 -9.1 2.9-17 7.9-24.5 13.6 -3.1 1.2-5.8 3-7.9 5.5 -10.4 6.8-19.6 14.8-27.4 24.6 -2.7 2.3-5.3 4.6-6.9 7.9 -12.3 13.5-21.9 28.7-28.4 45.8 -0.7 1.7-1.4 3.5-2.2 5.2 -0.4 0.7-0.8 1.5-1.2 2.2 -0.4 1.2-0.9 2.4-1.3 3.7 -2.5 5.5-4.9 11.1-5.2 17.3L18.5 155.9z"/>
    <path d="M306 97c-8.8 11.2-21.2 10.2-33.1 9 -6.9-0.7-11 1.9-16 5.7 -30.5 23.1-39.9 56.5-46.1 91.8 -1.7 9.6-4.1 19.1-7.5 28.7 -3.1-17.4-6.5-34.7-9.1-52.2 -2.9-19.1-9.5-36-25-48.5 -2.2-1.8-4.2-3.9-5.9-6.1 -10.3-12.9-21.3-23.7-40.4-19.3 -5.3 1.2-11.4-1.3-15.9-5.1 -2.8-2.4-4.6-5.8-2.3-9.3 2.5-3.8 5.6-2.3 9-0.3 9.8 5.7 11.4 5 11.6-4 0.4-0.2 0.4-0.5 0.2-0.8 3-2.3 6.1-3.3 9.7-1.3 0.8 0.8 2.3 2.3 2.4 2.3 1.7-1.5 0.8-3.1 0-4.8 -0.5-3.5-1-7.1-1.5-10.6 0.4-0.4 0.6-0.9 0.7-1.4 5.8-3.2 9.7-1.9 11.3 4.8 0.5 2.2 1.5 4.3 1.5 6.5 0.3 16.2 12 25.7 21.4 36.6 1.8 2.1 6 4.7 5.8-0.2 -0.5-11.4 7.8-24.3-5.4-34.2 -5.4-4-7.1-11.1-8.3-17.7 0-1.3 0-2.5 0-3.8 0.2-1.3 0.4-2.5 0.7-3.8 0 0 0.2-0.5 0.2-0.5 7.1-4.6 10.7-2.6 10.8 5.8 0 3.3 0.7 6.3 2.5 9.1 1.7 2.7 3.5 6.4 6.5 6.4 3.7 0 4.1-4.4 5-7.2 1.2-3.9 2.2-8 2.4-12 0.3-3.9 0.9-7.2 5.5-7.2 4.7 0 5.4 3.8 5.6 7.4 0.5 7.5-2.1 14.3-4.9 21.1 -2.7 6.4-6 12.3-7.6 19.3 -6 25.9 9 46.7 16.1 69.6 4.2-15.4 12.6-29.2 14.2-45.1 0.9-6.4 1-12.7-0.1-19.1 -0.1-6.8-2.2-13-5.3-19 -4.3-8.1-8.2-16.5-7.7-26.1 0.2-3.9 0.6-8.1 5.9-8 4.4 0.2 5.6 3.6 5.5 7.4 -0.2 5.6 1.4 10.6 3.6 15.6 1.9 4.3 3.9 4.1 6.9 1.1 4-4.1 5.6-9 5.5-14.7 -0.1-3.5 1.4-6.5 5.3-6.6 4.5-0.2 5.7 3.1 6 7 0.5 8-1.5 15.6-7.4 20.8 -7 6.2-9.7 12.7-6.6 21.6 0.8 2.3 0.2 5 0.5 7.6 0.2 1.7-1 4.1 1.5 4.9 1.9 0.6 3.6-0.5 5-1.9 4.5-4.4 7.1-10.5 12.5-14.1 5.2-3.5 7.4-8.3 7.7-14.4 0.2-3.7 1.3-7.5 2.3-11.1 2.4-8.5 5.2-9.2 12.5-3.6 0 1.1 0 2.2 0 3.3 -1 3-2 6-3.1 9.3 4.3-0.4 7.4-0.8 10.4-1.1l-0.1-0.1c1.2 1.8 2.7 3.4 2.6 5.8 -0.4 7.9 3 7.3 8.4 4 3.5-2.2 6.6-6.3 11.7-4.3C305.1 91.9 306 94.3 306 97z"/>
  </g>
</svg>`;

  // Render SVG to PNG using sharp
  await sharp(Buffer.from(iconSvg))
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(iconPngPath);

  return iconPngPath;
}

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

  // Render icon from SVG
  let iconPath;
  try {
    iconPath = await renderIconFromSvg(ICON_SIZE);
  } catch (error) {
    console.warn('Failed to render icon:', error.message);
  }

  let baseImage;

  if (backgroundImagePath && fs.existsSync(backgroundImagePath)) {
    // Use the provided background image, resize to OG dimensions
    baseImage = await sharp(backgroundImagePath)
      .resize(OG_WIDTH, OG_HEIGHT, {
        fit: 'cover',
        position: 'center',
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

  // Create overlay with gradient, icon, and title
  const overlay = await createOverlay(title, iconPath, fontFamily);

  // Composite the overlay on top of the base image
  await sharp(baseImage)
    .composite([
      {
        input: overlay,
        blend: 'over',
      },
    ])
    .png({ quality: 90 })
    .toFile(outputPath);

  return outputPath;
}

/**
 * Initialize the OG image generator (download fonts, etc.)
 * Call this before generating images in a batch.
 */
async function initOGImageGenerator() {
  await ensurePoppinsFont();
  try {
    await renderIconFromSvg(ICON_SIZE);
  } catch (error) {
    console.warn('Could not pre-render icon:', error.message);
  }
}

module.exports = {
  generateOGImage,
  initOGImageGenerator,
  // Export constants for testing/configuration
  OG_WIDTH,
  OG_HEIGHT,
  BRAND_PRIMARY,
  BRAND_SECONDARY,
};
