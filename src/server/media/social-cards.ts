// Social-card rendering for Astro builds.
import { createCanvas, GlobalFonts, loadImage, type SKRSContext2D } from '@napi-rs/canvas';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
/** Route families that have branded social cards. */
export type SocialCardKind = 'blog' | 'conditions' | 'clinics';

/** Clinic coordinates used to request the background map. */
export interface MapLocation {
  latitude: number;
  longitude: number;
}

/** Text, imagery and route identity for one card. */
export interface SocialCardEntry {
  kind: SocialCardKind;
  slug: string;
  title: string;
  backgroundImage?: string;
  mapLocation?: MapLocation;
  /** Optional filename stem preserving an existing public card URL. */
  mediaName?: string;
}

/** Lazy card inputs, including ordinary arrays. */
export type SocialCardEntries =
  | Iterable<SocialCardEntry>
  | AsyncIterable<SocialCardEntry>;

/** Output/cache directories and remote-image settings shared by a card batch. */
export interface PublicImageBuildOptions {
  publicDir: string;
  cacheDir: string;
  fetch?: typeof fetch;
  mapboxToken?: string;
  /** Approved CMS/CDN origins, including protocol and any custom port. */
  allowedMediaOrigins?: string[];
}

/** Inputs for rendering one card to its destination file. */
export interface GenerateSocialCardOptions {
  title: string;
  backgroundImage?: string;
  outputPath: string;
  fetch?: typeof fetch;
  /** Approved CMS/CDN origins, including protocol and any custom port. */
  allowedMediaOrigins?: string[];
}

/** Public/local output paths and cache status for one generated card. */
export interface SocialCardResult {
  kind: SocialCardKind;
  slug: string;
  imagePath: string;
  outputPath: string;
  wasCached: boolean;
}

/** Input and output SHA-256 pairs keyed by public card URL. Old input-only entries miss safely. */
type SocialCardCache = Record<string, string>;
const WIDTH = 1200;
const HEIGHT = 630;
const ASSET_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  './assets',
);
const FONT = path.join(ASSET_DIR, 'Poppins-ExtraBold.ttf');
const LOGO = path.join(ASSET_DIR, 'horizontal-logo.svg');
const BRAND_PRIMARY = '#1C5E38';
const CACHE_VERSION = 'aasc-og-v2';
const FONT_FAMILY = 'Poppins';
let fontRegistered = false;
/** Return a stable SHA-256 fingerprint for cache inputs or image bytes.
 * @param value Bytes or text to hash.
 * @returns The lowercase hexadecimal digest.
 */
const sha256 = (value: Buffer | string): string => {
  return createHash('sha256').update(value).digest('hex');
};
/** Reject a cache location nested inside public output so cached metadata cannot be shipped.
 * @param publicDir Build output directory that will be served publicly.
 * @param cacheDir Persistent directory intended to remain private.
 * @returns Throws when the cache directory overlaps public output.
 */
function assertPrivateCacheDir(publicDir: string, cacheDir: string): void {
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
 * @param value Media basename supplied by content or a build adapter.
 * @returns A normalized filesystem-safe segment.
 */
function safeSegment(value: string): string {
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
 * @param value Relative slug whose segments must match the public route and filename.
 * @returns Original safe path segments with only route-accepted leading/trailing slashes removed.
 */
function safePathSegments(value: string): string[] {
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
 * @param source Optional media URL or local path.
 * @returns The path basename without an extension, or `default` when no name exists.
 */
function basenameFromSource(source: string | undefined): string {
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
/** Resolve the public path shared by card generation and page metadata.
 * @param entry Card family, route slug, and optional source or map name.
 * @returns Stable site-relative JPEG path for this card.
 */
export function socialCardPath(entry: SocialCardEntry): string {
  const segments = safePathSegments(entry.slug);
  const name = safeSegment(entry.mediaName || (entry.mapLocation
    ? `${entry.slug}-${entry.mapLocation.latitude}-${entry.mapLocation.longitude}-map`
    : basenameFromSource(entry.backgroundImage)));
  return `/og-images/${entry.kind}/${[...segments.slice(0, -1), `${segments.at(-1)}-${name}.jpg`].join('/')}`;
}
/** Construct the Mapbox static-map request used for a clinic card.
 * @param latitude Clinic latitude in degrees, between -90 and 90.
 * @param longitude Clinic longitude in degrees, between -180 and 180.
 * @param token Public Mapbox token used only on this build-time request.
 * @returns The static-map request URL; callers must not serialize it.
 */
function mapboxStaticUrl(latitude: number, longitude: number, token: string): string {
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
 * @param source Local file path or remote image URL.
 * @param fetcher Fetch implementation used for remote requests, including deterministic fixtures.
 * @param [allowedMediaOrigins=[]] Exact HTTP(S) origins accepted for CMS media, including any configured port.
 * @param [allowMapbox=false] Whether this request came from a generated clinic-map URL.
 * @returns Validated image bytes accepted by Sharp.
 */
async function fetchImage(
  source: string,
  fetcher: typeof fetch,
  allowedMediaOrigins: string[] = [],
  allowMapbox = false,
): Promise<Buffer> {
  let bytes: Buffer;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
    const url = new URL(source);
    const hostname = url.hostname.toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
    const hostIsAllowed =
      (url.origin === 'https://api.mapbox.com' && allowMapbox) ||
      (hostname !== 'api.mapbox.com' &&
        allowedMediaOrigins.includes(url.origin));
    if (!hostIsAllowed) {
      throw new Error(`Remote image host is not allowed: ${hostname}`);
    }
    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && isLoopback)
    ) {
      throw new Error('Remote images must use HTTPS');
    }
    if (url.username || url.password) {
      throw new Error('Remote image URL credentials are not allowed');
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
    const chunks: Uint8Array[] = [];
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
 * @param ctx Canvas context used to measure text with the selected font.
 * @param text Title text to wrap.
 * @param maxWidth Maximum line width in pixels.
 * @returns Lines in display order.
 */
function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
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
 * @param title Source title supplied by a published record.
 * @param [limit=100] Maximum number of source characters before truncation.
 * @returns The original title or a shortened title ending in an ellipsis.
 */
function truncateTitle(title: string, limit = 100): string {
  if (title.length <= limit) {
    return title;
  }
  const prefix = title.slice(0, limit);
  const boundary = prefix.lastIndexOf(' ');
  return `${(boundary > limit * 0.7 ? prefix.slice(0, boundary) : prefix).trim()}…`;
}
/** Render the branded gradient, logo, and fitted title layer for an Open Graph card.
 * @param title Card title after CMS mapping.
 * @returns PNG bytes for compositing over the card background.
 */
async function createOverlay(title: string): Promise<Buffer> {
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
  const logoWidth = Math.round(logoHeight * (logoMeta.width! / logoMeta.height!));
  const logo = await loadImage(
    await sharp(LOGO).resize(logoWidth, logoHeight).png().toBuffer(),
  );
  ctx.drawImage(logo, 60, 40);
  const content = truncateTitle(title || 'Untitled');
  let fontSize = 64;
  let lines: string[] = [];
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
 * @param title Card title rendered into the overlay.
 * @param mediaBytes Validated background image bytes, or undefined for the branded fallback.
 * @param outputPath Destination path for the JPEG output.
 * @returns The path of the written image.
 */
async function renderSocialCard(
  title: string,
  mediaBytes: Buffer | undefined,
  outputPath: string,
): Promise<string> {
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
 * @param options Card title, optional background source, destination path, and remote-fetch controls.
 * @returns The destination path of the generated JPEG card.
 */
export async function generateSocialCard({
  title,
  backgroundImage,
  outputPath,
  fetch: fetcher = fetch,
  allowedMediaOrigins = [],
}: GenerateSocialCardOptions): Promise<string> {
  let base: Buffer | undefined;
  if (backgroundImage) {
    try {
      base = await fetchImage(backgroundImage, fetcher, allowedMediaOrigins);
    } catch {
      /* Missing media is a supported branded-card fallback. */
    }
  }
  return renderSocialCard(title, base, outputPath);
}
/**
 * Generate a complete build-time set of public social cards. The cache key
 * covers media bytes (not mtime), title, font, logo and renderer version.
 * @param entries Lazy published card inputs; the next entry is requested only after the current card finishes.
 * @param options Public output directory, private cache directory, fetcher, and optional map settings.
 * @returns Card paths and cache-hit flags in input order.
 */
export async function buildSocialCards(
  entries: SocialCardEntries,
  options: PublicImageBuildOptions,
): Promise<SocialCardResult[]> {
  const fetcher = options.fetch || fetch;
  const cardsDir = path.join(options.publicDir, 'og-images');
  const cacheFile = path.join(options.cacheDir, 'social-cards.json');
  assertPrivateCacheDir(options.publicDir, options.cacheDir);
  await mkdir(cardsDir, { recursive: true });
  await mkdir(options.cacheDir, { recursive: true });
  let cache: SocialCardCache = {};
  try {
    cache = JSON.parse(await readFile(cacheFile, 'utf8'));
  } catch {
    /* First build or empty cache. */
  }
  const fontBytes = await readFile(FONT);
  const logoBytes = await readFile(LOGO);
  const results: SocialCardResult[] = [];
  const outputPaths = new Set<string>();
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
    const imagePath = socialCardPath(entry);
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
    let mediaBytes: Buffer | undefined;
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
          options.allowedMediaOrigins,
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
    let outputHash: string | undefined;
    try {
      outputHash = sha256(await readFile(outputPath));
    } catch {
      /* Cache miss. */
    }
    // The JPEG and metadata can come from different saves after a cache I/O failure.
    // Verify both inputs and actual output bytes before accepting a restored card.
    const wasCached = outputHash !== undefined &&
      cache[cacheKey] === `${contentHash}:${outputHash}`;
    if (!wasCached) {
      await renderSocialCard(entry.title || 'Untitled', mediaBytes, outputPath);
      cache[cacheKey] = `${contentHash}:${sha256(await readFile(outputPath))}`;
    }
    results.push({ kind, slug: entry.slug, imagePath, outputPath, wasCached });
  }
  const temporaryCacheFile = `${cacheFile}.${process.pid}.tmp`;
  await writeFile(temporaryCacheFile, `${JSON.stringify(cache, null, 2)}\n`);
  await rename(temporaryCacheFile, cacheFile);
  return results;
}
