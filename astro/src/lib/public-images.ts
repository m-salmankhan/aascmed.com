import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MediaDescriptor } from '../../../src/shared/content/models';

const WIDTH = 1200;
const HEIGHT = 630;
const ASSET_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../src/shared/media/assets');
const FONT = path.join(ASSET_DIR, 'Poppins-ExtraBold.ttf');
const LOGO = path.join(ASSET_DIR, 'horizontal-logo.svg');
const BRAND_PRIMARY = '#1C5E38';
const CACHE_VERSION = 'aasc-og-v2';
const FONT_FAMILY = 'Poppins';
let fontRegistered = false;

export type SocialCardKind = 'blog' | 'conditions' | 'clinics';

export interface SocialCardEntry {
  kind: SocialCardKind;
  slug: string;
  title: string;
  /** Local image path or HTTPS URL. Missing or unreadable images use the branded fallback. */
  backgroundImage?: string;
  /** Clinic coordinates for a build-time Mapbox static image. */
  mapLocation?: { latitude: number; longitude: number };
  /** Stable output basename used to preserve the existing `/og-images/{kind}/...jpg` URL. */
  mediaName?: string;
}

export interface PublicImageBuildOptions {
  /** Build's static public directory (for example Astro's configured `static/`). */
  publicDir: string;
  /** Persistent, private build cache directory. Never place this under publicDir. */
  cacheDir: string;
  /** Optional fetch implementation for deterministic tests and controlled build environments. */
  fetch?: typeof fetch;
  /** Public Mapbox token used only in the build request, never returned in a descriptor. */
  mapboxToken?: string;
  /** Exact HTTPS media hostnames allowed for build-time fetches. Mapbox static maps are allowed separately. */
  allowedMediaHosts?: string[];
}

export interface SocialCardResult {
  kind: SocialCardKind;
  slug: string;
  /** Relative path suitable for metadata and `publicDir` output. */
  imagePath: string;
  outputPath: string;
  wasCached: boolean;
}

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex');

function assertPrivateCacheDir(publicDir: string, cacheDir: string): void {
  const relative = path.relative(path.resolve(publicDir), path.resolve(cacheDir));
  if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Public image cache must be outside the public output directory');
  }
}

function safeSegment(value: string): string {
  const normalized = value.normalize('NFKD').replace(/[\\/]/g, '-').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '');
  if (!normalized || normalized === '.' || normalized === '..') throw new Error(`Invalid public image path segment: ${value}`);
  return normalized;
}

function safePathSegments(value: string): string[] {
  if (!value || value.includes('\\')) throw new Error(`Invalid public image path: ${value}`);
  const segments = value.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`Invalid public image path: ${value}`);
  }
  return segments.map(safeSegment);
}

function basenameFromSource(source?: string): string {
  if (!source) return 'default';
  let basename = source;
  try { basename = new URL(source).pathname; } catch { /* A filesystem path is expected. */ }
  return path.basename(basename, path.extname(basename)) || 'default';
}

function mapboxStaticUrl(latitude: number, longitude: number, token: string): string {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Clinic map coordinates are invalid');
  }
  const marker = `pin-l+1C5E38(${longitude},${latitude})`;
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${marker}/${longitude},${latitude},18/${WIDTH}x${HEIGHT}@2x?access_token=${encodeURIComponent(token)}`;
}

async function fetchImage(source: string, fetcher: typeof fetch, allowedMediaHosts: string[] = [], allowMapbox = false): Promise<Buffer> {
  let bytes: Buffer;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) {
    const url = new URL(source);
    const hostname = url.hostname.toLowerCase();
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
    const hostIsAllowed = (hostname === 'api.mapbox.com' && allowMapbox) || (hostname !== 'api.mapbox.com' && allowedMediaHosts.some((host) => host.toLowerCase() === hostname));
    if (!hostIsAllowed) throw new Error(`Remote image host is not allowed: ${hostname}`);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && isLoopback)) throw new Error('Remote images must use HTTPS');
    if (url.username || url.password || (url.port && url.port !== '443' && !isLoopback)) throw new Error('Remote image URL credentials and non-standard ports are not allowed');
    const response = await fetcher(url, { signal: AbortSignal.timeout(12_000), redirect: 'error' });
    if (!response.ok) throw new Error(`Image request returned HTTP ${response.status}`);
    const maxBytes = 20 * 1024 * 1024;
    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > maxBytes) throw new Error('Image exceeds the 20 MB build limit');
    if (!response.body) throw new Error('Image response has no body');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxBytes) throw new Error('Image exceeds the 20 MB build limit');
        chunks.push(value);
      }
    } catch (error) {
      await reader.cancel().catch(() => undefined);
      throw error;
    }
    bytes = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), totalBytes);
  } else {
    bytes = await readFile(source);
  }
  // Reject non-image/invalid payloads early; sharp enforces the actual decoder format.
  await sharp(bytes, { limitInputPixels: 80_000_000 }).metadata();
  return bytes;
}

function wrapText(ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

function truncateTitle(title: string, limit = 100): string {
  if (title.length <= limit) return title;
  const prefix = title.slice(0, limit);
  const boundary = prefix.lastIndexOf(' ');
  return `${(boundary > limit * 0.7 ? prefix.slice(0, boundary) : prefix).trim()}…`;
}

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
  const logo = await loadImage(await sharp(LOGO).resize(logoWidth, logoHeight).png().toBuffer());
  ctx.drawImage(logo, 60, 40);

  const content = truncateTitle(title || 'Untitled');
  let fontSize = 64;
  let lines: string[] = [];
  for (; fontSize >= 36; fontSize -= 4) {
    ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;
    lines = wrapText(ctx, content, WIDTH - 120);
    if (lines.length <= 3 && lines.length * fontSize * 1.3 <= HEIGHT - 220) break;
  }
  ctx.font = `bold ${Math.max(fontSize, 36)}px ${FONT_FAMILY}`;
  if (lines.length > 3) {
    lines = lines.slice(0, 3);
    let last = lines[2];
    while (last && ctx.measureText(`${last}…`).width > WIDTH - 120) last = last.slice(0, -1).trim();
    lines[2] = `${last}…`;
  }
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lineHeight = Math.max(fontSize, 36) * 1.35;
  const startY = 160 + (HEIGHT - 160 - 60 - lines.length * lineHeight) / 2;
  lines.forEach((line, index) => ctx.fillText(line, 60, startY + index * lineHeight));
  return canvas.toBuffer('image/png');
}

async function renderSocialCard(title: string, mediaBytes: Buffer | undefined, outputPath: string): Promise<string> {
  await mkdir(path.dirname(outputPath), { recursive: true });
  const background = mediaBytes
    ? await sharp(mediaBytes).resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' }).png().toBuffer()
    : await sharp({ create: { width: WIDTH, height: HEIGHT, channels: 4, background: BRAND_PRIMARY } }).png().toBuffer();
  await sharp(background)
    .composite([{ input: await createOverlay(title) }])
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(outputPath);
  return outputPath;
}

/** Generate one framework-independent, deterministic Open Graph card. */
export async function generateSocialCard({ title, backgroundImage, outputPath, fetch: fetcher = fetch, allowedMediaHosts = [] }: {
  title: string;
  backgroundImage?: string;
  outputPath: string;
  fetch?: typeof fetch;
  allowedMediaHosts?: string[];
}): Promise<string> {
  let base: Buffer | undefined;
  if (backgroundImage) {
    try { base = await fetchImage(backgroundImage, fetcher, allowedMediaHosts); } catch { /* Missing media is a supported branded-card fallback. */ }
  }
  return renderSocialCard(title, base, outputPath);
}

/**
 * Generate a complete build-time set of public social cards. The cache key
 * covers media bytes (not mtime), title, font, logo and renderer version.
 */
export async function buildSocialCards(entries: SocialCardEntry[], options: PublicImageBuildOptions): Promise<SocialCardResult[]> {
  const fetcher = options.fetch || fetch;
  const cardsDir = path.join(options.publicDir, 'og-images');
  const cacheFile = path.join(options.cacheDir, 'social-cards.json');
  assertPrivateCacheDir(options.publicDir, options.cacheDir);
  await mkdir(cardsDir, { recursive: true });
  await mkdir(options.cacheDir, { recursive: true });
  let cache: Record<string, string> = {};
  try { cache = JSON.parse(await readFile(cacheFile, 'utf8')) as Record<string, string>; } catch { /* First build or empty cache. */ }

  const fontBytes = await readFile(FONT);
  const logoBytes = await readFile(LOGO);
  const results: SocialCardResult[] = [];
  for (const entry of entries) {
    if (!['blog', 'conditions', 'clinics'].includes(entry.kind)) throw new Error(`Unsupported social card kind: ${entry.kind}`);
    const kind = entry.kind;
    const slugSegments = safePathSegments(entry.slug);
    const slug = slugSegments.join('/');
    const mediaName = safeSegment(entry.mediaName || (entry.mapLocation
      ? `${slug}-${entry.mapLocation.latitude}-${entry.mapLocation.longitude}-map`
      : basenameFromSource(entry.backgroundImage)));
    const fileName = `${slugSegments.at(-1)}-${mediaName}.jpg`;
    const imagePath = `/og-images/${kind}/${[...slugSegments.slice(0, -1), fileName].join('/')}`;
    const outputPath = path.join(cardsDir, kind, ...slugSegments.slice(0, -1), fileName);
    const cacheKey = `${kind}:${slug}:${mediaName}`;
    let mediaBytes: Buffer | undefined;
    const isMapboxMap = !entry.backgroundImage && !!entry.mapLocation && !!options.mapboxToken;
    const backgroundImage = entry.backgroundImage || (isMapboxMap
      ? mapboxStaticUrl(entry.mapLocation!.latitude, entry.mapLocation!.longitude, options.mapboxToken!)
      : undefined);
    if (backgroundImage) {
      try { mediaBytes = await fetchImage(backgroundImage, fetcher, options.allowedMediaHosts, isMapboxMap); } catch { /* Missing media uses the branded fallback. */ }
    }
    const contentHash = sha256(Buffer.concat([
      Buffer.from(CACHE_VERSION), Buffer.from(entry.title || 'Untitled'), fontBytes, logoBytes,
      mediaBytes || Buffer.from('no-media'),
    ]));
    let exists = false;
    try { exists = (await stat(outputPath)).isFile(); } catch { /* Cache miss. */ }
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

/** Build content-addressed AVIF/WebP/JPEG candidates for a public CMS image. */
export async function buildResponsiveImage({ source, alt, outputDir, publicUrlPrefix, filename, widths = [320, 640, 960, 1280], fetch: fetcher = fetch, allowedMediaHosts = [] }: {
  source: string;
  alt: string;
  outputDir: string;
  publicUrlPrefix: string;
  filename?: string;
  widths?: number[];
  fetch?: typeof fetch;
  allowedMediaHosts?: string[];
}): Promise<MediaDescriptor> {
  const input = await fetchImage(source, fetcher, allowedMediaHosts);
  const image = sharp(input, { limitInputPixels: 80_000_000 });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error('Source image has no dimensions');
  const sourceHash = sha256(input).slice(0, 16);
  const base = safeSegment(filename || basenameFromSource(source));
  await mkdir(outputDir, { recursive: true });
  const candidates = [...new Set(widths.filter((width) => width > 0 && width <= metadata.width!))].sort((a, b) => a - b);
  if (!candidates.includes(metadata.width)) candidates.push(metadata.width);
  const formats: MediaDescriptor['formats'] = [];
  let jpegCandidates: string[] = [];
  for (const [extension, format, mimeType] of [['avif', 'avif', 'image/avif'], ['webp', 'webp', 'image/webp'], ['jpg', 'jpeg', 'image/jpeg']] as const) {
    const urls: string[] = [];
    for (const width of candidates) {
      const outputName = `${base}-${sourceHash}-${width}.${extension}`;
      const outputPath = path.join(outputDir, outputName);
      try { await stat(outputPath); } catch {
        await sharp(input).resize({ width, withoutEnlargement: true, fit: 'inside' }).toFormat(format).toFile(outputPath);
      }
      urls.push(`${publicUrlPrefix.replace(/\/$/, '')}/${outputName} ${width}w`);
    }
    if (extension === 'jpg') jpegCandidates = urls;
    else formats.push({ type: mimeType, srcSet: urls.join(', ') });
  }
  const width = metadata.width;
  const height = metadata.height;
  const largestWidth = candidates[candidates.length - 1];
  return {
    src: `${publicUrlPrefix.replace(/\/$/, '')}/${base}-${sourceHash}-${largestWidth}.jpg`,
    alt,
    width,
    height,
    mimeType: metadata.format ? `image/${metadata.format === 'jpg' ? 'jpeg' : metadata.format}` : undefined,
    srcSet: jpegCandidates.join(', '),
    sources: candidates.map((candidate) => ({ src: `${publicUrlPrefix.replace(/\/$/, '')}/${base}-${sourceHash}-${candidate}.jpg`, width: candidate })),
    formats,
    aspectRatio: width / height,
  };
}
