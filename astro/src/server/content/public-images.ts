// Streams published records into public images and compact route/descriptor indexes.
import type {
  BlogRecord,
  ConditionRecord,
  MediaDescriptor,
} from '../../../../src/shared/content/models.ts';
import {
  blogPath,
  clinicPath,
  conditionPath,
  providerPath,
  serviceUpdatePath,
} from '../../../../src/shared/content/urls.ts';
import {
  buildResponsiveImage,
  buildSocialCards,
  type MapLocation,
  type PublicImageBuildOptions,
  type SocialCardEntry,
  type SocialCardResult,
} from '../../lib/public-images.mjs';
import type { PublishedCollections } from './loaders.ts';
import type { PublishedRouteKind, PublishedRouteManifestEntry } from './routes.ts';
import path from 'node:path';
/** One-shot published streams used for images and the route index; reviews are not consumed. */
export type PublishedImageCollections = Pick<
  PublishedCollections,
  'blogs' | 'clinics' | 'conditions' | 'providers' | 'serviceUpdates'
>;
/** Published thumbnail-bearing record consumed by the responsive-image builder. */
type PublishedThumbnailRecord = BlogRecord | ConditionRecord;
/** Route families with responsive thumbnail derivatives. */
type ResponsiveImageKind = 'blog' | 'condition';
/** Private compact indexes bound to one static build, without CMS records or rich-text bodies. */
export interface PublishedImageManifestEnvelope {
  version: 1;
  buildId: string;
  result: PublishedImageBuildResult;
}
/** Parsed JSON is checked before current-build indexes are used. */
type ParsedImageManifestEnvelope = Partial<PublishedImageManifestEnvelope>;
export interface PublishedSocialCardOptions extends Omit<PublicImageBuildOptions, 'fetch'> {
  siteTitle?: string;
}
export interface PublishedImageBuildResult {
  cards: SocialCardResult[];
  mediaByRoute: Record<string, MediaDescriptor>;
  routes: PublishedRouteManifestEntry[];
}
/** Remove a route-family prefix without changing the full relative slug.
 * @param pathname Validated canonical route, or null for invalid content.
 * @param family Route prefix to remove.
 * @returns The relative slug preserving all parent directories, or null for a missing route.
 */
function routeSlug(pathname: string | null, family: string): string | null {
  const prefix = `/${family}/`;
  return pathname?.startsWith(prefix) ? pathname.slice(prefix.length).replace(/\/$/, '') : null;
}
/** Process one record at a time, retaining only public image descriptors and route references.
 * @param collections Lazy published streams; each stream is consumed once, with no review fetches.
 * @param options Public output and private image cache locations, allowed hosts and branding settings.
 * @returns Compact path/card/media indexes. CMS records and their bodies are never collected or serialized.
 */
export async function buildPublishedSocialCards(
  collections: PublishedImageCollections,
  options: PublishedSocialCardOptions,
): Promise<PublishedImageBuildResult> {
  const mediaByRoute: Record<string, MediaDescriptor> = {};
  const routes: PublishedRouteManifestEntry[] = [];
  const routePaths = new Set<string>();
  /** Add one validated route to the lightweight reference index.
   * @param pathname Canonical public path, or null for invalid content.
   * @param kind Route family for sitemap consumers.
   * @returns Nothing; duplicate routes fail before conflicting image output is published.
   */
  function addRoute(pathname: string | null, kind: PublishedRouteKind): void {
    if (!pathname) {
      return;
    }
    if (routePaths.has(pathname)) {
      throw new Error('Published content contains duplicate routes');
    }
    routePaths.add(pathname);
    routes.push({ pathname, kind });
  }
  /** Generate the current record's responsive thumbnail before advancing its CMS stream.
   * @param kind Thumbnail route family.
   * @param record Current normalized record; it is not retained after this iteration.
   * @param slug Complete route-relative slug, including parent directories.
   * @returns After the descriptor and image files have been generated.
   */
  async function buildResponsive(
    kind: ResponsiveImageKind,
    record: PublishedThumbnailRecord,
    slug: string,
  ): Promise<void> {
    if (!record.thumbnail?.src) {
      return;
    }
    mediaByRoute[`${kind}:${slug}`] = await buildResponsiveImage({
      source: record.thumbnail.src,
      alt: record.thumbnail.alt,
      outputDir: path.join(options.publicDir, 'media'),
      publicUrlPrefix: '/media',
      filename: `${kind}-${slug}`,
      allowedMediaHosts: options.allowedMediaHosts,
    });
  }
  /** Consume each route-bearing collection once and feed cards to the renderer with backpressure.
   * @yields One small card input after its current record's route and responsive media are handled.
   * @returns After all five streams are exhausted; review data is never requested.
   */
  async function* entries(): AsyncGenerator<SocialCardEntry> {
    for await (const blog of collections.blogs) {
      const pathname = blogPath(blog.slug);
      addRoute(pathname, 'blog');
      const slug = routeSlug(pathname, 'blog');
      if (!slug) {
        continue;
      }
      await buildResponsive('blog', blog, slug);
      yield {
        kind: 'blog',
        slug,
        title: blog.heading || blog.title,
        backgroundImage: blog.thumbnail?.src,
      };
    }
    for await (const condition of collections.conditions) {
      const pathname = conditionPath(condition.slug);
      addRoute(pathname, 'condition');
      const slug = routeSlug(pathname, 'conditions');
      if (!slug) {
        continue;
      }
      await buildResponsive('condition', condition, slug);
      yield {
        kind: 'conditions',
        slug,
        title: condition.heading || condition.title,
        backgroundImage: condition.thumbnail?.src,
      };
    }
    for await (const provider of collections.providers) {
      addRoute(providerPath(provider.slug), 'provider');
    }
    for await (const clinic of collections.clinics) {
      const pathname = clinicPath(clinic);
      addRoute(pathname, 'clinic');
      const slug = routeSlug(pathname, 'clinics');
      if (!slug) {
        continue;
      }
      const latitude = clinic.location?.latitude;
      const longitude = clinic.location?.longitude;
      const mapLocation: MapLocation | undefined =
        typeof latitude === 'number' && typeof longitude === 'number'
          ? { latitude, longitude }
          : undefined;
      const leafSlug = slug.split('/').at(-1);
      yield {
        kind: 'clinics',
        slug,
        title: `${options.siteTitle || 'Allergy, Asthma and Sinus Centers'} ${clinic.clinicName || clinic.title}`,
        mapLocation,
        mediaName: mapLocation ? `${leafSlug}-${latitude}-${longitude}-map` : undefined,
      };
    }
    for await (const update of collections.serviceUpdates) {
      addRoute(serviceUpdatePath(update), 'service-update');
    }
  }
  const cards = await buildSocialCards(entries(), options);
  return { cards, mediaByRoute, routes };
}
/** Read the generated descriptor manifest only inside the matching static build; SSR returns null.
 * @returns Current build's image/card descriptors, or null when no active static-build manifest is available.
 */
export async function getPublishedImageManifest(): Promise<PublishedImageBuildResult | null> {
  if (import.meta.env?.PUBLIC_ASTRO_TARGET !== 'static') {
    return null;
  }
  const buildId = process.env.ASTRO_BUILD_IMAGE_MANIFEST_ID;
  const configuredPath = process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
  if (
    !buildId ||
    !configuredPath ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildId)
  ) {
    return null;
  }
  const manifestPath = path.resolve(
    process.cwd(),
    '.astro',
    'public-image-manifests',
    `${buildId}.json`,
  );
  if (path.resolve(configuredPath) !== manifestPath) {
    return null;
  }
  try {
    const { readFile } = await import('node:fs/promises');
    const envelope = JSON.parse(
      await readFile(manifestPath, 'utf8'),
    ) as ParsedImageManifestEnvelope;
    if (envelope.version !== 1 || envelope.buildId !== buildId || !envelope.result) {
      throw new Error('manifest mismatch');
    }
    return envelope.result;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return null;
    }
    throw new Error('Could not read the private public-image manifest');
  }
}
/** Read the active build's compact route index without loading CMS content again.
 * @returns Public route references, or null outside a matching active static build.
 */
export async function getPublishedBuildRoutes(): Promise<PublishedRouteManifestEntry[] | null> {
  return (await getPublishedImageManifest())?.routes ?? null;
}
