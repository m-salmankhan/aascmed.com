// TypeScript declarations for the shared Node-compatible image renderer.
export type SocialCardKind = 'blog' | 'conditions' | 'clinics';

export interface MapLocation {
  latitude: number;
  longitude: number;
}

export interface SocialCardEntry {
  kind: SocialCardKind;
  slug: string;
  title: string;
  backgroundImage?: string;
  mapLocation?: MapLocation;
  mediaName?: string;
}

/** Lazy card inputs, including ordinary arrays used by Gatsby. */
export type SocialCardEntries = Iterable<SocialCardEntry> | AsyncIterable<SocialCardEntry>;

export interface PublicImageBuildOptions {
  publicDir: string;
  cacheDir: string;
  fetch?: typeof fetch;
  mapboxToken?: string;
  allowedMediaHosts?: string[];
}

export interface GenerateSocialCardOptions {
  title: string;
  backgroundImage?: string;
  outputPath: string;
  fetch?: typeof fetch;
  allowedMediaHosts?: string[];
}

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
