// Maps one published content snapshot to social cards and responsive image descriptors.
import type { BlogRecord, ConditionRecord, MediaDescriptor } from '../../../../src/shared/content/models.ts';
import { blogPath, clinicPath, conditionPath } from '../../../../src/shared/content/urls.ts';
import { buildResponsiveImage, buildSocialCards, type MapLocation, type PublicImageBuildOptions, type SocialCardEntry, type SocialCardKind, type SocialCardResult } from '../../lib/public-images.ts';
import type { PublishedContentSnapshot } from './loaders.ts';
import path from 'node:path';

/** Published collections that contribute social cards or responsive public media. */
export type PublishedImageCollections = Pick<PublishedContentSnapshot, 'blogs' | 'clinics' | 'conditions'>;
/** Published record shape accepted by the responsive thumbnail adapter. */
type PublishedThumbnailRecord = BlogRecord | ConditionRecord;
/** Route families whose cards receive responsive media derivatives. */
type ResponsiveImageKind = 'blog' | 'condition';
/** Social-card family recognized by the public card URL adapter. */
type PublishedImageFamily = SocialCardKind;
/** Private JSON shape written during static image generation and read by prerender routes. */
export interface PublishedImageManifestEnvelope {
  version: 1;
  buildId: string;
  result: PublishedImageBuildResult;
}
/** Untrusted parsed envelope shape checked before exposing build outputs to routes. */
type ParsedImageManifestEnvelope = Partial<PublishedImageManifestEnvelope>;

export interface PublishedSocialCardOptions extends Omit<PublicImageBuildOptions, 'fetch'> {
  siteTitle?: string;
}

export interface PublishedImageBuildResult {
  cards: SocialCardResult[];
  mediaByRoute: Record<string, MediaDescriptor>;
}

/** Remove one public route-family prefix while retaining the entire relative nested slug.
 * @param pathname Canonical path returned by the shared URL helper, or null for invalid content.
 * @param family Route prefix that must be removed from the canonical path.
 * @returns Full relative slug, including nested segments, or null when the path is absent or unsafe.
 */
function routeSlug(pathname: string | null, family: PublishedImageFamily): string | null {
  if (!pathname) return null;
  const prefix = `/${family}/`;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).replace(/\/$/, '');
  return slug && !slug.split('/').some((segment) => !segment || segment === '.' || segment === '..') ? slug : null;
}

/** Convert an already-loaded published snapshot to public card inputs without making CMS requests.
 * @param collections Already-mapped published blogs, clinics, and conditions.
 * @param siteTitle Brand title used as the prefix for clinic-card titles.
 * @returns Social-card entries in blog, condition, then clinic collection order.
 */
export function publishedSocialCardEntries(
  collections: PublishedImageCollections,
  siteTitle = 'Allergy, Asthma and Sinus Centers',
): SocialCardEntry[] {
  const entries: SocialCardEntry[] = [];
  for (const blog of collections.blogs) {
    const slug = routeSlug(blogPath(blog.slug), 'blog');
    if (slug) entries.push({ kind: 'blog', slug, title: blog.heading || blog.title, backgroundImage: blog.thumbnail?.src });
  }
  for (const condition of collections.conditions) {
    const slug = routeSlug(conditionPath(condition.slug), 'conditions');
    if (slug) entries.push({ kind: 'conditions', slug, title: condition.heading || condition.title, backgroundImage: condition.thumbnail?.src });
  }
  for (const clinic of collections.clinics) {
    const slug = routeSlug(clinicPath(clinic), 'clinics');
    if (!slug) continue;
    const latitude = clinic.location?.latitude;
    const longitude = clinic.location?.longitude;
    const mapLocation: MapLocation | undefined = typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : undefined;
    entries.push({
      kind: 'clinics',
      slug,
      title: `${siteTitle} ${clinic.clinicName || clinic.title}`,
      mapLocation,
      mediaName: mapLocation ? `${slug}-${latitude}-${longitude}-map` : undefined,
    });
  }
  return entries;
}

/** Build social cards and responsive thumbnails from one normalized published snapshot.
 * @param collections Already-loaded blog, clinic, and condition records for this build.
 * @param options Public output and private cache locations, allowed media hosts, map token, and brand title.
 * @returns Card results and responsive descriptors keyed by complete relative route slug.
 */
export async function buildPublishedSocialCards(
  collections: PublishedImageCollections,
  options: PublishedSocialCardOptions,
): Promise<PublishedImageBuildResult> {
  const cards = await buildSocialCards(publishedSocialCardEntries(collections, options.siteTitle), options);
  const mediaByRoute: Record<string, MediaDescriptor> = {};
  /** Generate one record's responsive thumbnail and store it under its complete route key.
   * @param kind Blog or condition route family used in descriptor keys and filenames.
   * @param record Published record whose thumbnail is already mapped by the Strapi adapter.
   * @returns Promise<void> after its descriptor and files are available.
   */
  const buildResponsive = async (kind: ResponsiveImageKind, record: PublishedThumbnailRecord): Promise<void> => {
    const route = kind === 'blog' ? blogPath(record.slug) : conditionPath(record.slug);
    const slug = routeSlug(route, kind === 'blog' ? 'blog' : 'conditions');
    const media = record.thumbnail;
    if (!slug || !media?.src) return;
    mediaByRoute[`${kind}:${slug}`] = await buildResponsiveImage({
      source: media.src,
      alt: media.alt,
      outputDir: path.join(options.publicDir, 'media'),
      publicUrlPrefix: '/media',
      filename: `${kind}-${slug}`,
      allowedMediaHosts: options.allowedMediaHosts,
    });
  };
  for (const blog of collections.blogs) await buildResponsive('blog', blog);
  for (const condition of collections.conditions) await buildResponsive('condition', condition);
  return { cards, mediaByRoute };
}

/** Read the generated descriptor manifest only inside the matching static build; SSR returns null.
 * @returns Current build's image/card descriptors, or null when no active static-build manifest is available.
 */
export async function getPublishedImageManifest(): Promise<PublishedImageBuildResult | null> {
  if (import.meta.env?.PUBLIC_ASTRO_TARGET !== 'static') return null;
  const buildId = process.env.ASTRO_BUILD_SNAPSHOT_ID;
  const configuredPath = process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
  if (!buildId || !configuredPath || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildId)) return null;
  const manifestPath = path.resolve(process.cwd(), '.astro', 'public-image-manifests', `${buildId}.json`);
  if (path.resolve(configuredPath) !== manifestPath) return null;
  try {
    const { readFile } = await import('node:fs/promises');
    const envelope = JSON.parse(await readFile(manifestPath, 'utf8')) as ParsedImageManifestEnvelope;
    if (envelope.version !== 1 || envelope.buildId !== buildId || !envelope.result) throw new Error('manifest mismatch');
    return envelope.result;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw new Error('Could not read the private public-image manifest');
  }
}
