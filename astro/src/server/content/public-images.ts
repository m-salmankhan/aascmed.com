import type { BlogRecord, ConditionRecord, MediaDescriptor } from '../../../../src/shared/content/models.ts';
import { blogPath, clinicPath, conditionPath } from '../../../../src/shared/content/urls.ts';
import { buildResponsiveImage, buildSocialCards, type PublicImageBuildOptions, type SocialCardEntry, type SocialCardResult } from '../../lib/public-images.ts';
import type { PublishedContentSnapshot } from './loaders.ts';
import path from 'node:path';

export type PublishedImageCollections = Pick<PublishedContentSnapshot, 'blogs' | 'clinics' | 'conditions'>;

export interface PublishedSocialCardOptions extends Omit<PublicImageBuildOptions, 'fetch'> {
  siteTitle?: string;
}

export interface PublishedImageBuildResult {
  cards: SocialCardResult[];
  mediaByRoute: Record<string, MediaDescriptor>;
}

function routeSlug(pathname: string | null, family: 'blog' | 'conditions' | 'clinics'): string | null {
  if (!pathname) return null;
  const prefix = `/${family}/`;
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).replace(/\/$/, '');
  return slug && !slug.split('/').some((segment) => !segment || segment === '.' || segment === '..') ? slug : null;
}

/** Convert an already-loaded published snapshot to public cards; this adapter never requests CMS data. */
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
    const mapLocation = typeof latitude === 'number' && typeof longitude === 'number' ? { latitude, longitude } : undefined;
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

/** Build cards and responsive derivatives from the same already-loaded published snapshot. */
export async function buildPublishedSocialCards(
  collections: PublishedImageCollections,
  options: PublishedSocialCardOptions,
): Promise<PublishedImageBuildResult> {
  const cards = await buildSocialCards(publishedSocialCardEntries(collections, options.siteTitle), options);
  const mediaByRoute: Record<string, MediaDescriptor> = {};
  const buildResponsive = async (kind: 'blog' | 'condition', record: BlogRecord | ConditionRecord) => {
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

/** Read the generated descriptors only from a static build context; SSR never reads the manifest. */
export async function getPublishedImageManifest(): Promise<PublishedImageBuildResult | null> {
  if (import.meta.env?.PUBLIC_ASTRO_TARGET !== 'static') return null;
  const buildId = process.env.ASTRO_BUILD_SNAPSHOT_ID;
  const configuredPath = process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
  if (!buildId || !configuredPath || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildId)) return null;
  const manifestPath = path.resolve(process.cwd(), '.astro', 'public-image-manifests', `${buildId}.json`);
  if (path.resolve(configuredPath) !== manifestPath) return null;
  try {
    const { readFile } = await import('node:fs/promises');
    const envelope = JSON.parse(await readFile(manifestPath, 'utf8')) as { version?: number; buildId?: string; result?: PublishedImageBuildResult };
    if (envelope.version !== 1 || envelope.buildId !== buildId || !envelope.result) throw new Error('manifest mismatch');
    return envelope.result;
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw new Error('Could not read the private public-image manifest');
  }
}
