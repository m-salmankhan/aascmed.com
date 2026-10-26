import type { BlogRecord, ClinicRecord, ConditionRecord } from '../../../../src/shared/content/models.ts';
import { blogPath, clinicPath, conditionPath } from '../../../../src/shared/content/urls.ts';
import type { MediaDescriptor } from '../../../../src/shared/content/models.ts';
import { buildResponsiveImage, buildSocialCards, type PublicImageBuildOptions, type SocialCardEntry, type SocialCardResult } from '../../lib/public-images.ts';
import path from 'node:path';

export interface PublishedImageCollections {
  blogs: BlogRecord[];
  clinics: ClinicRecord[];
  conditions: ConditionRecord[];
}

export interface PublishedSocialCardOptions extends Omit<PublicImageBuildOptions, 'fetch'> {
  siteTitle?: string;
}

export interface PublishedImageBuildResult {
  cards: SocialCardResult[];
  mediaByRoute: Record<string, MediaDescriptor>;
}

const routeSlug = (pathname: string | null): string | null => pathname?.split('/').filter(Boolean).at(-1) ?? null;

/** Convert an already-loaded published snapshot to public cards; this adapter never requests CMS data. */
export function publishedSocialCardEntries(
  collections: PublishedImageCollections,
  siteTitle = 'Allergy, Asthma and Sinus Centers',
): SocialCardEntry[] {
  const entries: SocialCardEntry[] = [];
  for (const blog of collections.blogs) {
    const slug = routeSlug(blogPath(blog.slug));
    if (slug) entries.push({ kind: 'blog', slug, title: blog.heading || blog.title, backgroundImage: blog.thumbnail?.src });
  }
  for (const condition of collections.conditions) {
    const slug = routeSlug(conditionPath(condition.slug));
    if (slug) entries.push({ kind: 'conditions', slug, title: condition.heading || condition.title, backgroundImage: condition.thumbnail?.src });
  }
  for (const clinic of collections.clinics) {
    const slug = routeSlug(clinicPath(clinic));
    if (!slug) continue;
    const latitude = clinic.location?.latitude;
    const longitude = clinic.location?.longitude;
    const mapLocation = typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : undefined;
    const mediaName = mapLocation ? `${slug}-${latitude}-${longitude}-map` : undefined;
    entries.push({
      kind: 'clinics',
      slug,
      title: `${siteTitle} ${clinic.clinicName || clinic.title}`,
      mapLocation,
      mediaName,
    });
  }
  return entries;
}

/** Build cards from the same published snapshot route enumeration uses. */
export async function buildPublishedSocialCards(
  collections: PublishedImageCollections,
  options: PublishedSocialCardOptions,
): Promise<PublishedImageBuildResult> {
  const entries = publishedSocialCardEntries(collections, options.siteTitle);
  const cards = await buildSocialCards(entries, options);
  const mediaByRoute: Record<string, MediaDescriptor> = {};
  for (const blog of collections.blogs) {
    const slug = routeSlug(blogPath(blog.slug));
    if (!slug || !blog.thumbnail?.src) continue;
    mediaByRoute[`blog:${slug}`] = await buildResponsiveImage({
      source: blog.thumbnail.src,
      alt: blog.thumbnail.alt,
      outputDir: path.join(options.publicDir, 'media'),
      publicUrlPrefix: '/media',
      filename: `blog-${slug}`,
    });
  }
  for (const condition of collections.conditions) {
    const slug = routeSlug(conditionPath(condition.slug));
    if (!slug || !condition.thumbnail?.src) continue;
    mediaByRoute[`condition:${slug}`] = await buildResponsiveImage({
      source: condition.thumbnail.src,
      alt: condition.thumbnail.alt,
      outputDir: path.join(options.publicDir, 'media'),
      publicUrlPrefix: '/media',
      filename: `condition-${slug}`,
    });
  }
  return { cards, mediaByRoute };
}

/** Read the generated public descriptors only from Astro's static build context. */
export async function getPublishedImageManifest(): Promise<PublishedImageBuildResult | null> {
  if (import.meta.env?.PUBLIC_ASTRO_TARGET !== 'static') return null;
  const manifestPath = path.resolve(process.cwd(), '.astro', 'public-image-manifest.json');
  try {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(manifestPath, 'utf8')) as PublishedImageBuildResult;
  } catch {
    return null;
  }
}
