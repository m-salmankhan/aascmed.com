// Builds cacheable social cards from the public CMS streams.
import type { ClinicRecord } from '../../../../src/shared/content/models.ts';
import {
  blogPath,
  clinicPath,
  conditionPath,
} from '../../../../src/shared/content/urls.ts';
import {
  buildSocialCards,
  type MapLocation,
  type PublicImageBuildOptions,
  type SocialCardEntry,
  type SocialCardResult,
} from '../../../../src/shared/media/social-cards.mjs';
import type { PublishedCollections } from './loaders.ts';

/** Lazy CMS streams needed to render public blog, condition and clinic cards. */
export type PublishedImageCollections = Pick<
  PublishedCollections,
  'blogs' | 'clinics' | 'conditions'
>;

export interface PublishedSocialCardOptions
  extends Omit<PublicImageBuildOptions, 'fetch'> {
  siteTitle?: string;
}

/** Remove a route-family prefix and preserve nested slugs for card output paths.
 * @param pathname Validated canonical route, or null when the CMS slug is invalid.
 * @param family Route prefix to remove.
 * @returns Relative slug, including parent directories, or null for an invalid route.
 */
function routeSlug(pathname: string | null, family: string): string | null {
  const prefix = `/${family}/`;
  if (!pathname?.startsWith(prefix)) {
    return null;
  }
  return pathname.slice(prefix.length).replace(/\/$/, '');
}

/** Render published social cards while consuming each needed CMS stream once.
 * @param collections Lazy published blog, condition and clinic streams.
 * @param options Public card output/cache paths, media host allowlist and optional branding settings.
 * @returns Generated card records; CMS bodies and source descriptors are not retained.
 */
export async function buildPublishedSocialCards(
  collections: PublishedImageCollections,
  options: PublishedSocialCardOptions,
): Promise<SocialCardResult[]> {
  /** Yield the card input for each record whose canonical route is valid.
   * @yields One card input at a time so image generation provides backpressure to CMS pagination.
   * @returns Completes after the three card-bearing CMS streams are consumed.
   */
  async function* entries(): AsyncGenerator<SocialCardEntry> {
    for await (const blog of collections.blogs) {
      const slug = routeSlug(blogPath(blog.slug), 'blog');
      if (!slug) {
        continue;
      }
      yield {
        kind: 'blog',
        slug,
        title: blog.heading || blog.title,
        backgroundImage: blog.thumbnail?.src,
      };
    }
    for await (const condition of collections.conditions) {
      const slug = routeSlug(conditionPath(condition.slug), 'conditions');
      if (!slug) {
        continue;
      }
      yield {
        kind: 'conditions',
        slug,
        title: condition.heading || condition.title,
        backgroundImage: condition.thumbnail?.src,
      };
    }
    for await (const clinic of collections.clinics) {
      const slug = routeSlug(clinicPath(clinic), 'clinics');
      if (!slug) {
        continue;
      }
      const mapLocation = clinicMapLocation(clinic);
      const leafSlug = slug.split('/').at(-1);
      yield {
        kind: 'clinics',
        slug,
        title: `${options.siteTitle || 'Allergy, Asthma and Sinus Centers'} ${clinic.clinicName || clinic.title}`,
        mapLocation,
        mediaName: mapLocation
          ? `${leafSlug}-${mapLocation.latitude}-${mapLocation.longitude}-map`
          : undefined,
      };
    }
  }

  return buildSocialCards(entries(), options);
}

/** Return Mapbox coordinates only when both normalized values are numeric.
 * @param clinic Published clinic whose location can supply a social-card map.
 * @returns Coordinates for a map card, or undefined when the record has no complete location.
 */
function clinicMapLocation(clinic: ClinicRecord): MapLocation | undefined {
  const latitude = clinic.location?.latitude;
  const longitude = clinic.location?.longitude;
  return typeof latitude === 'number' && typeof longitude === 'number'
    ? { latitude, longitude }
    : undefined;
}
