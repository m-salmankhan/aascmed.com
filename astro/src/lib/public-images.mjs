// @ts-check
// Shared social-card rendering and responsive image generation for Astro and Gatsby builds.
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/** @typedef {import('../../../src/shared/content/models').MediaDescriptor} MediaDescriptor */
/** @typedef {ReturnType<ReturnType<typeof import('@napi-rs/canvas').createCanvas>['getContext']>} CanvasContext */
/** @typedef {'blog' | 'conditions' | 'clinics'} SocialCardKind */
/** @typedef {{ latitude: number, longitude: number }} MapLocation */
/** @typedef {Record<string, string>} SocialCardCache */
/** @typedef {Iterable<SocialCardEntry> | AsyncIterable<SocialCardEntry>} SocialCardEntries */
/** @typedef {['avif' | 'webp' | 'jpg', 'avif' | 'webp' | 'jpeg', 'image/avif' | 'image/webp' | 'image/jpeg']} ResponsiveOutputFormat */
/**
 * @typedef {object} SocialCardEntry
 * @property {SocialCardKind} kind Content route family used in the card URL.
 * @property {string} slug Route-relative slug; nested segments are retained.
 * @property {string} title Text rendered on the card.
 * @property {string} [backgroundImage] Local path or allowlisted image URL.
 * @property {MapLocation} [mapLocation] Clinic coordinates used for a generated Mapbox map.
 * @property {string} [mediaName] Stable basename preserving the existing card URL.
 */
/**
 * @typedef {object} PublicImageBuildOptions
 * @property {string} publicDir Build's static public directory.
 * @property {string} cacheDir Persistent private cache directory outside public output.
 * @property {typeof fetch} [fetch] Fetch implementation for controlled build environments.
 * @property {string} [mapboxToken] Public token used only for the build-time map request.
 * @property {string[]} [allowedMediaHosts] Exact HTTPS hostnames allowed for CMS media.
 */
/**
 * @typedef {object} GenerateSocialCardOptions
 * @property {string} title Text rendered on the card.
 * @property {string} [backgroundImage] Optional local path or allowlisted image URL.
 * @property {string} outputPath Destination path for the JPEG card.
 * @property {typeof fetch} [fetch] Fetch implementation for deterministic tests.
 * @property {string[]} [allowedMediaHosts] Exact HTTPS hostnames allowed for background media.
 */
/**
 * @typedef {object} ResponsiveImageOptions
 * @property {string} source Local path or allowlisted image URL.
 * @property {string} alt Accessible alternative text for the source image.
 * @property {string} outputDir Destination for generated image candidates.
 * @property {string} publicUrlPrefix Public URL prefix for generated candidates.
 * @property {string} [filename] Optional stable basename without an extension.
 * @property {number[]} [widths] Candidate widths, capped to the oriented source width.
 * @property {typeof fetch} [fetch] Fetch implementation for controlled builds.
 * @property {string[]} [allowedMediaHosts] Exact HTTPS hostnames allowed for the source.
 */
/**
 * @typedef {object} SocialCardResult
 * @property {SocialCardKind} kind Card route family.
 * @property {string} slug Original route-relative slug.
 * @property {string} imagePath Relative public URL suitable for page metadata.
 * @property {string} outputPath Local path to the emitted JPEG.
 * @property {boolean} wasCached Whether the existing output matched current inputs.
 */
const WIDTH = 1200;
const HEIGHT = 630;
const ASSET_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../src/shared/media/assets',
);
const FONT = path.join(ASSET_DIR, 'Poppins-ExtraBold.ttf');
const LOGO = path.join(ASSET_DIR, 'horizontal-logo.svg');
const BRAND_PRIMARY = '#1C5E38';
const CACHE_VERSION = 'aasc-og-v2';
const FONT_FAMILY = 'Poppins';
let fontRegistered = false;
/** Return a stable SHA-256 fingerprint for cache inputs or image bytes.
 * @param {Buffer | string} value Bytes or text to hash.
 * @returns {string} The lowercase hexadecimal digest.
 */
const sha256 = (value) => {
  return createHash('sha256').update(value).digest('hex');
};
/** Reject a cache location nested inside public output so cached metadata cannot be shipped.
 * @param {string} publicDir Build output directory that will be served publicly.
 * @param {string} cacheDir Persistent directory intended to remain private.
 * @returns {void} Throws when the cache directory overlaps public output.
 */
function assertPrivateCacheDir(publicDir, cacheDir) {
  const relative = path.relative(
    path.resolve(publicDir),
    path.resolve(cacheDir),
  );
  if (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  ) {
    throw new Error(
      'Public image cache must be outside the public output directory',
    );
  }
}
/** Normalize one generated media basename and reject values that normalize to an unsafe path.
 * @param {string} value Media basename supplied by content or a build adapter.
 * @returns {string} A normalized filesystem-safe segment.
 */
function safeSegment(value) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\\/]/g, '-')
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  if (!normalized || normalized === '.' || normalized === '..') {
    throw new Error(`Invalid public image path segment: ${value}`);
  }
  return normalized;
}
/** Validate and preserve a shared-route-valid slug's filesystem segments and hierarchy.
 * @param {string} value Relative slug whose segments must match the public route and filename.
 * @returns {string[]} Original safe path segments with only route-accepted leading/trailing slashes removed.
 */
function safePathSegments(value) {
  const relativeSlug = value.replace(/^\/+|\/+$/g, '');
  if (!relativeSlug || relativeSlug.includes('\\')) {
    throw new Error(`Invalid public image path: ${value}`);
  }
  const segments = relativeSlug.split('/');
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        /[\u0000-\u0020\u007F?#\\%]/.test(segment),
    )
  ) {
    throw new Error(`Invalid public image path: ${value}`);
  }
  return segments;
}
/** Derive a stable media basename from a URL or local source path.
 * @param {string | undefined} source Optional media URL or local path.
 * @returns {string} The path basename without an extension, or `default` when no name exists.
 */
function basenameFromSource(source) {
  if (!source) {
    return 'default';
  }
  let basename = source;
  try {
    basename = new URL(source).pathname;
  } catch {
    /* A filesystem path is expected. */
  }
  return path.basename(basename, path.extname(basename)) || 'default';
}
/** Construct the Mapbox static-map request used for a clinic card.
 * @param {number} latitude Clinic latitude in degrees, between -90 and 90.
 * @param {number} longitude Clinic longitude in degrees, between -180 and 180.
 * @param {string} token Public Mapbox token used only on this build-time request.
 * @returns {string} The static-map request URL; callers must not serialize it.
 */
function mapboxStaticUrl(latitude, longitude, token) {
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Clinic map coordinates are invalid');
  }
  const marker = `pin-l+1C5E38(${longitude},${latitude})`;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${marker}/${longitude},${latitude},18/${WIDTH}x${HEIGHT}@2x?access_token=${encodeURIComponent(token)}`;
}
/** Read and validate a local image or an allowlisted remote image with a bounded response body.
 * @param {string} source Local file path or remote image URL.
 * @param {typeof fetch} fetcher Fetch implementation used for remote requests, including deterministic fixtures.
 * @param {string[]} [allowedMediaHosts=[]] Exact remote hostnames accepted for CMS media.
 * @param {boolean} [allowMapbox=false] Whether this request came from a generated clinic-map URL.
 * @returns {Promise<Buffer>} Validated image bytes accepted by Sharp.
 */
async function fetchImage(
  source,
  fetcher,
  allowedMediaHosts = [],
  allowMapbox = false,
) {
  /** @type {Buffer} */
  let bytes;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
    const url = new URL(source);
    const hostname = url.hostname.toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
    const hostIsAllowed =
      (hostname === 'api.mapbox.com' && allowMapbox) ||
      (hostname !== 'api.mapbox.com' &&
        allowedMediaHosts.some((host) => host.toLowerCase() === hostname));
    if (!hostIsAllowed) {
      throw new Error(`Remote image host is not allowed: ${hostname}`);
    }
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && isLoopback)
    ) {
      throw new Error('Remote images must use HTTPS');
    }
    if (
      url.username ||
      url.password ||
      (url.port && url.port !== '443' && !isLoopback)
    ) {
      throw new Error(
        'Remote image URL credentials and non-standard ports are not allowed',
      );
    }
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(12000),
      redirect: 'error',
    });
    if (!response.ok) {
      throw new Error(`Image request returned HTTP ${response.status}`);
    }
    const maxBytes = 20 * 1024 * 1024;
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxBytes) {
      throw new Error('Image exceeds the 20 MB build limit');
    }
    if (!response.body) {
      throw new Error('Image response has no body');
    }
    const reader = response.body.getReader();
    /** @type {Uint8Array[]} */
    const chunks = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) {
          throw new Error('Image exceeds the 20 MB build limit');
        }
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    }
    bytes = Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk)),
      totalBytes,
    );
  } else {
    bytes = await readFile(source);
  }
  // Reject non-image/invalid payloads early; sharp enforces the actual decoder format.
  await sharp(bytes, { limitInputPixels: 80000000 }).metadata();
  return bytes;
}
/** Wrap a title at word boundaries so each rendered line fits the card width.
 * @param {CanvasContext} ctx Canvas context used to measure text with the selected font.
 * @param {string} text Title text to wrap.
 * @param {number} maxWidth Maximum line width in pixels.
 * @returns {string[]} Lines in display order.
 */
function wrapText(ctx, text, maxWidth) {
  /** @type {string[]} */
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) {
    lines.push(line);
  }
  return lines;
}
/** Bound long social-card titles while preserving the last complete word when possible.
 * @param {string} title Source title supplied by a published record.
 * @param {number} [limit=100] Maximum number of source characters before truncation.
 * @returns {string} The original title or a shortened title ending in an ellipsis.
 */
function truncateTitle(title, limit = 100) {
  if (title.length <= limit) {
    return title;
  }
  const prefix = title.slice(0, limit);
  const boundary = prefix.lastIndexOf(' ');
  return `${(boundary > limit * 0.7 ? prefix.slice(0, boundary) : prefix).trim()}…`;
}
/** Render the branded gradient, logo, and fitted title layer for an Open Graph card.
 * @param {string} title Card title after CMS mapping.
 * @returns {Promise<Buffer>} PNG bytes for compositing over the card background.
 */
async function createOverlay(title) {
  if (!fontRegistered) {
    GlobalFonts.registerFromPath(FONT, FONT_FAMILY);
    fontRegistered = true;
  }
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, HEIGHT, WIDTH, 0);
  gradient.addColorStop(0.25, 'rgba(28, 94, 56, 0.88)');
  gradient.addColorStop(1, 'rgba(77, 162, 73, 0.84)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const logoMeta = await sharp(LOGO).metadata();
  const logoHeight = 70;
  const logoWidth = Math.round(logoHeight * (logoMeta.width / logoMeta.height));
  const logo = await loadImage(
    await sharp(LOGO).resize(logoWidth, logoHeight).png().toBuffer(),
  );
  ctx.drawImage(logo, 60, 40);
  const content = truncateTitle(title || 'Untitled');
  let fontSize = 64;
  /** @type {string[]} */
  let lines = [];
  for (; fontSize >= 36; fontSize -= 4) {
    ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    lines = wrapText(ctx, content, WIDTH - 120);
    if (lines.length <= 3 && lines.length * fontSize * 1.3 <= HEIGHT - 220) {
      break;
    }
  }
  ctx.font = `bold ${Math.max(fontSize, 36)}px ${FONT_FAMILY}`;
  if (lines.length > 3) {
    lines = lines.slice(0, 3);
    let last = lines[2];
    while (last && ctx.measureText(`${last}…`).width > WIDTH - 120) {
      last = last.slice(0, -1).trim();
    }
    lines[2] = `${last}…`;
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lineHeight = Math.max(fontSize, 36) * 1.35;
  const startY = 160 + (HEIGHT - 160 - 60 - lines.length * lineHeight) / 2;
  lines.forEach((line, index) =>
    ctx.fillText(line, 60, startY + index * lineHeight),
  );
  return canvas.toBuffer('image/png');
}
/** Crop an optional background, composite the branded overlay, and write the JPEG card.
 * @param {string} title Card title rendered into the overlay.
 * @param {Buffer | undefined} mediaBytes Validated background image bytes, or undefined for the branded fallback.
 * @param {string} outputPath Destination path for the JPEG output.
 * @returns {Promise<string>} The path of the written image.
 */
async function renderSocialCard(title, mediaBytes, outputPath) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const background = mediaBytes
    ? await sharp(mediaBytes)
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
        .png()
        .toBuffer()
    : await sharp({
        create: {
          width: WIDTH,
          height: HEIGHT,
          channels: 4,
          background: BRAND_PRIMARY,
        },
      })
        .png()
        .toBuffer();
  await sharp(background)
    .composite([{ input: await createOverlay(title) }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outputPath);
  return outputPath;
}
/** Generate one framework-independent Open Graph card using the branded fallback when media is unavailable.
 * @param {GenerateSocialCardOptions} options Card title, optional background source, destination path, and remote-fetch controls.
 * @returns {Promise<string>} The destination path of the generated JPEG card.
 */
export async function generateSocialCard({
  title,
  backgroundImage,
  outputPath,
  fetch: fetcher = fetch,
  allowedMediaHosts = [],
}) {
  /** @type {Buffer | undefined} */
  let base;
  if (backgroundImage) {
    try {
      base = await fetchImage(backgroundImage, fetcher, allowedMediaHosts);
    } catch {
      /* Missing media is a supported branded-card fallback. */
    }
  }
  return renderSocialCard(title, base, outputPath);
}
/**
 * Generate a complete build-time set of public social cards. The cache key
 * covers media bytes (not mtime), title, font, logo and renderer version.
 * @param {SocialCardEntries} entries Lazy published card inputs; the next entry is requested only after the current card finishes.
 * @param {PublicImageBuildOptions} options Public output directory, private cache directory, fetcher, and optional map settings.
 * @returns {Promise<SocialCardResult[]>} Card paths and cache-hit flags in input order.
 */
export async function buildSocialCards(entries, options) {
  const fetcher = options.fetch || fetch;
  const cardsDir = path.join(options.publicDir, 'og-images');
  const cacheFile = path.join(options.cacheDir, 'social-cards.json');
  assertPrivateCacheDir(options.publicDir, options.cacheDir);
  await mkdir(cardsDir, { recursive: true });
  await mkdir(options.cacheDir, { recursive: true });
  /** @type {SocialCardCache} */
  let cache = {};
  try {
    cache = JSON.parse(await readFile(cacheFile, 'utf8'));
  } catch {
    /* First build or empty cache. */
  }
  const fontBytes = await readFile(FONT);
  const logoBytes = await readFile(LOGO);
  /** @type {SocialCardResult[]} */
  const results = [];
  const outputPaths = new Set();
  for await (const entry of entries) {
    if (!['blog', 'conditions', 'clinics'].includes(entry.kind)) {
      throw new Error(`Unsupported social card kind: ${entry.kind}`);
    }
    const kind = entry.kind;
    const slugSegments = safePathSegments(entry.slug);
    const slug = slugSegments.join('/');
    const mediaName = safeSegment(
      entry.mediaName ||
        (entry.mapLocation
          ? `${slug}-${entry.mapLocation.latitude}-${entry.mapLocation.longitude}-map`
          : basenameFromSource(entry.backgroundImage)),
    );
    const fileName = `${slugSegments.at(-1)}-${mediaName}.jpg`;
    const imagePath = `/og-images/${kind}/${[...slugSegments.slice(0, -1), fileName].join('/')}`;
    const outputPath = path.join(
      cardsDir,
      kind,
      ...slugSegments.slice(0, -1),
      fileName,
    );
    const absoluteOutputPath = path.resolve(outputPath);
    if (outputPaths.has(absoluteOutputPath)) {
      throw new Error(`Duplicate public image output path: ${imagePath}`);
    }
    outputPaths.add(absoluteOutputPath);
    const cacheKey = `${kind}:${slug}:${mediaName}`;
    /** @type {Buffer | undefined} */
    let mediaBytes;
    const mapLocation = entry.mapLocation;
    const mapboxToken = options.mapboxToken;
    const isMapboxMap =
      !entry.backgroundImage && !!mapLocation && !!mapboxToken;
    const backgroundImage =
      entry.backgroundImage ||
      (isMapboxMap && mapLocation && mapboxToken
        ? mapboxStaticUrl(
            mapLocation.latitude,
            mapLocation.longitude,
            mapboxToken,
          )
        : undefined);
    if (backgroundImage) {
      try {
        mediaBytes = await fetchImage(
          backgroundImage,
          fetcher,
          options.allowedMediaHosts,
          isMapboxMap,
        );
      } catch {
        /* Missing media uses the branded fallback. */
      }
    }
    const contentHash = sha256(
      Buffer.concat([
        Buffer.from(CACHE_VERSION),
        Buffer.from(entry.title || 'Untitled'),
        fontBytes,
        logoBytes,
        mediaBytes || Buffer.from('no-media'),
      ]),
    );
    let exists = false;
    try {
      exists = (await stat(outputPath)).isFile();
    } catch {
      /* Cache miss. */
    }
    const wasCached = exists && cache[cacheKey] === contentHash;
    if (!wasCached) {
      await renderSocialCard(entry.title || 'Untitled', mediaBytes, outputPath);
      cache[cacheKey] = contentHash;
    }
    results.push({ kind, slug: entry.slug, imagePath, outputPath, wasCached });
  }
  const temporaryCacheFile = `${cacheFile}.${process.pid}.tmp`;
  await writeFile(temporaryCacheFile, `${JSON.stringify(cache, null, 2)}\n`);
  await rename(temporaryCacheFile, cacheFile);
  return results;
}
/** Build content-addressed AVIF, WebP, and JPEG candidates for a public CMS image.
 * @param {ResponsiveImageOptions} options Source URL or path, alt text, output location, public URL prefix, and candidate widths.
 * @returns {Promise<MediaDescriptor>} A serializable descriptor with oriented dimensions and responsive source sets.
 */
export async function buildResponsiveImage({
  source,
  alt,
  outputDir,
  publicUrlPrefix,
  filename,
  widths = [320, 640, 960, 1280],
  fetch: fetcher = fetch,
  allowedMediaHosts = [],
}) {
  const input = await fetchImage(source, fetcher, allowedMediaHosts);
  const image = sharp(input, { limitInputPixels: 80000000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Source image has no dimensions');
  }
  const orientation = metadata.orientation ?? 1;
  const swapsDimensions = orientation >= 5 && orientation <= 8;
  const width = swapsDimensions ? metadata.height : metadata.width;
  const height = swapsDimensions ? metadata.width : metadata.height;
  const orientationSuffix =
    orientation === 1 ? '' : `-orientation-${orientation}`;
  const sourceHash = sha256(input).slice(0, 16);
  const base = safeSegment(filename || basenameFromSource(source));
  await mkdir(outputDir, { recursive: true });
  const candidates = [
    ...new Set(
      widths.filter(
        (candidateWidth) => candidateWidth > 0 && candidateWidth <= width,
      ),
    ),
  ].sort((a, b) => a - b);
  if (!candidates.includes(width)) {
    candidates.push(width);
  }
  /** @type {NonNullable<MediaDescriptor['formats']>} */
  const formats = [];
  /** @type {string[]} */
  let jpegCandidates = [];
  /** @type {ResponsiveOutputFormat[]} */
  const outputFormats = [
    ['avif', 'avif', 'image/avif'],
    ['webp', 'webp', 'image/webp'],
    ['jpg', 'jpeg', 'image/jpeg'],
  ];
  for (const [extension, format, mimeType] of outputFormats) {
    const urls = [];
    for (const width of candidates) {
      const outputName = `${base}-${sourceHash}${orientationSuffix}-${width}.${extension}`;
      const outputPath = path.join(outputDir, outputName);
      try {
        await stat(outputPath);
      } catch {
        await sharp(input)
          .rotate()
          .resize({ width, withoutEnlargement: true, fit: 'inside' })
          .toFormat(format)
          .toFile(outputPath);
      }
      urls.push(
        `${publicUrlPrefix.replace(/\/$/, '')}/${outputName} ${width}w`,
      );
    }
    if (extension === 'jpg') {
      jpegCandidates = urls;
    } else {
      formats.push({ type: mimeType, srcSet: urls.join(', ') });
    }
  }
  const largestWidth = candidates[candidates.length - 1];
  return {
    src: `${publicUrlPrefix.replace(/\/$/, '')}/${base}-${sourceHash}${orientationSuffix}-${largestWidth}.jpg`,
    alt,
    width,
    height,
    mimeType: 'image/jpeg',
    srcSet: jpegCandidates.join(', '),
    sources: candidates.map((candidate) => ({
      src: `${publicUrlPrefix.replace(/\/$/, '')}/${base}-${sourceHash}${orientationSuffix}-${candidate}.jpg`,
      width: candidate,
    })),
    formats,
    aspectRatio: width / height,
  };
}
