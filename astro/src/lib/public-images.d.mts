// TypeScript declarations for the shared Node-compatible image renderer.

/** Route families that have branded social cards. */
export type SocialCardKind =
  | 'blog'
  | 'conditions'
  | 'clinics';

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

/** Lazy card inputs, including ordinary arrays used by Gatsby. */
export type SocialCardEntries =
  | Iterable<SocialCardEntry>
  | AsyncIterable<SocialCardEntry>;

/** Output/cache directories and remote-image settings shared by a card batch. */
export interface PublicImageBuildOptions {
  publicDir: string;
  cacheDir: string;
  fetch?: typeof fetch;
  mapboxToken?: string;
  allowedMediaHosts?: string[];
}

/** Inputs for rendering one card to its destination file. */
export interface GenerateSocialCardOptions {
  title: string;
  backgroundImage?: string;
  outputPath: string;
  fetch?: typeof fetch;
  allowedMediaHosts?: string[];
}

/** Public/local output paths and cache status for one generated card. */
export interface SocialCardResult {
  kind: SocialCardKind;
  slug: string;
  imagePath: string;
  outputPath: string;
  wasCached: boolean;
}

/** Render one framework-independent Open Graph card with the branded fallback when needed.
 * @param options Card title, optional background source, destination path, and remote-fetch controls.
 * @returns The destination path of the generated JPEG card.
 */
export function generateSocialCard(
  options: GenerateSocialCardOptions,
): Promise<string>;
/** Build social-card images for published entries and report cache reuse per card.
 * @param entries Published blog, condition, or clinic card inputs with relative slugs.
 * @param options Public output directory, private cache directory, fetcher, and optional map settings.
 * @returns Card paths and cache-hit flags in input order.
 */
export function buildSocialCards(
  entries: SocialCardEntries,
  options: PublicImageBuildOptions,
): Promise<SocialCardResult[]>;
