// Maps lazy CMS records and homepage sections into the shared homepage view inputs.
import type { ComponentProps } from 'react';
import { getImage } from 'astro:assets';
import heroBackground from '../../../../static/assets/hero-bg.png';
import type { HomeView } from '../../../../src/views/home';
import type { JsonValue, MediaDescriptor } from '../../../../src/shared/content/models';
import {
  blogPath,
  clinicPath,
  conditionPath,
  providerPath,
  serviceUpdatePath,
} from '../../../../src/shared/content/urls';
import {
  getBlogs,
  getClinics,
  getConditions,
  getHomePage,
  getProviders,
  getReviews,
  getServiceUpdates,
} from '../content/loaders';
import type { ContentMode } from '../content/strapi';
import { getResponsiveMediaDescriptor } from '../content/astro-media';
import { blogDate } from './content';
/** Shared homepage props and their nested section/media models. */
type HomeProps = ComponentProps<typeof HomeView>;
type HomeSection = HomeProps['contact'];
type HomeMediaItem = NonNullable<HomeSection['media']>[number];
type HomeJsonObject = {
  [key: string]: JsonValue;
};
const SITE_TITLE = 'Allergy, Asthma and Sinus Centers';
/** Read a normalized JSON object without treating arrays or scalars as section data.
 * @param value JSON-safe CMS section or feedback value.
 * @returns Its object fields, or undefined for absent or non-object values.
 */
function sectionObject(value: JsonValue | undefined): HomeJsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}
/** Read optional CMS text while preserving the shared view's existing empty defaults.
 * @param value Normalized CMS field.
 * @returns Its text, or an empty string when absent.
 */
function text(value: JsonValue | undefined): string {
  return typeof value === 'string' ? value : '';
}
/** Recognize media descriptors already validated by the normalized Strapi homepage mapper.
 * @param value One normalized section-media entry.
 * @returns Whether the entry contains the required public source and alt-text fields.
 */
function isMediaDescriptor(value: unknown): value is MediaDescriptor {
  return (
    !!value &&
    typeof value === 'object' &&
    'src' in value &&
    typeof value.src === 'string' &&
    'alt' in value &&
    typeof value.alt === 'string'
  );
}
/** Use native Astro image output, generated at build time or on demand by the SSR image endpoint.
 * @param media Optional normalized CMS descriptor.
 * @param aspectRatio Optional thumbnail crop ratio, matching the shared Gatsby view.
 * @returns Its native responsive descriptor, or undefined when absent.
 */
async function image(
  media: MediaDescriptor | undefined,
  aspectRatio?: number,
): Promise<MediaDescriptor | undefined> {
  return media ? getResponsiveMediaDescriptor(media, aspectRatio) : undefined;
}
/** Preserve a section's image/video inputs while using native Astro output for image entries.
 * @param value Normalized CMS section, with its mapped media descriptors.
 * @returns Shared media entries, or undefined when the CMS supplied none.
 */
async function sectionMedia(
  value: HomeJsonObject | undefined,
): Promise<HomeMediaItem[] | undefined> {
  if (!Array.isArray(value?.media) || !value.media.length) {
    return undefined;
  }
  const media: HomeMediaItem[] = [];
  for (const entry of value.media) {
    if (!isMediaDescriptor(entry)) {
      continue;
    }
    const descriptor = entry.mimeType?.startsWith('image/') ? await image(entry) : entry;
    media.push({ mime: entry.mimeType, name: entry.alt, url: entry.src, descriptor });
  }
  return media.length ? media : undefined;
}
/** Normalize one homepage section using the same headings and optional blocks as Gatsby.
 * @param value Normalized section from the CMS homepage singleton.
 * @param fallback Existing display heading used when the CMS heading is absent.
 * @returns The shared section heading, rich-text blocks and media.
 */
async function section(value: JsonValue | undefined, fallback: string): Promise<HomeSection> {
  const fields = sectionObject(value);
  return {
    heading: text(fields?.heading) || fallback,
    text: Array.isArray(fields?.text) ? fields.text : undefined,
    media: await sectionMedia(fields),
  };
}
/** Load the maintained local hero image through Astro's native asset pipeline.
 * @returns A serializable responsive hero descriptor using static assets or the SSR image endpoint.
 */
async function heroImage(): Promise<MediaDescriptor> {
  const widths = [320, 640, 960, 1280].filter((width) => width < heroBackground.width);
  widths.push(heroBackground.width);
  const result = await getImage({ src: heroBackground, widths, format: 'webp' });
  return {
    src: result.src,
    alt: '',
    width: heroBackground.width,
    height: heroBackground.height,
    mimeType: 'image/webp',
    srcSet: result.srcSet.attribute,
    sources: result.srcSet.values.map(({ url, transform }) => ({
      src: url,
      width: transform.width ?? heroBackground.width,
    })),
  };
}
/** Load just the homepage's display models from lazy CMS streams, stopping its limited archives early.
 * @param mode Published content or saved drafts selected by the server deployment.
 * @returns Homepage view props and the CMS metadata description, without raw expanded collection records.
 */
export async function getHomePageData(mode: ContentMode) {
  const home = await getHomePage(mode);
  const conditions: HomeProps['conditions']['items'] = [];
  for await (const condition of getConditions(mode, { pageSize: 11 })) {
    const slug = conditionPath(condition.slug);
    if (!slug) {
      continue;
    }
    conditions.push({
      slug,
      title: condition.heading || condition.title || '',
      thumbnail: await image(condition.thumbnail),
    });
    if (conditions.length === 11) {
      break;
    }
  }
  const blogs: HomeProps['blogs']['items'] = [];
  for await (const blog of getBlogs(mode, { pageSize: 6 })) {
    const slug = blogPath(blog.slug);
    if (!slug) {
      continue;
    }
    blogs.push({
      slug,
      title: blog.title || '',
      date: blogDate(blog.date),
      description: blog.description || '',
    });
    if (blogs.length === 6) {
      break;
    }
  }
  const serviceUpdates: HomeProps['serviceUpdates']['items'] = [];
  for await (const update of getServiceUpdates(mode, { pageSize: 3 })) {
    const slug = serviceUpdatePath(update);
    if (!slug) {
      continue;
    }
    serviceUpdates.push({
      slug,
      title: update.title || '',
      date: blogDate(update.date),
      description: update.description || '',
    });
    if (serviceUpdates.length === 3) {
      break;
    }
  }
  const providers: HomeProps['providers']['items'] = [];
  for await (const provider of getProviders(mode)) {
    if (provider.retirementNotice?.retired) {
      continue;
    }
    const slug = providerPath(provider.slug);
    if (!slug) {
      continue;
    }
    providers.push({
      slug,
      retired: false,
      name: {
        fullName: provider.name?.fullName || '',
        title:
          provider.name?.honorific && provider.name.honorific !== 'None'
            ? provider.name.honorific
            : '',
        degreeAbbr: provider.name?.qualificationAbbr || '',
      },
      image: await image(provider.image, 1),
    });
  }
  const reviews: HomeProps['feedback']['reviews'] = [];
  for await (const review of getReviews(mode)) {
    reviews.push({
      reviewerName: review.name || '',
      stars: review.stars || 0,
      body: review.content || null,
      source: { url: review.sourceUrl || '', name: review.sourceName || '' },
    });
  }
  const practices: HomeProps['locations']['practices'] = [];
  const clinicOptions: string[] = [];
  for await (const clinic of getClinics(mode)) {
    const slug = clinicPath(clinic);
    if (!slug) {
      continue;
    }
    practices.push({
      slug,
      clinic_name: clinic.clinicName || 'Untitled Clinic',
      latitude: clinic.location?.latitude || 0,
      longitude: clinic.location?.longitude || 0,
      address: clinic.location?.address || '',
      phone: clinic.contact?.phone || '',
      fax: clinic.contact?.fax || '',
    });
    if (clinic.clinicName) {
      clinicOptions.push(clinic.clinicName);
    }
  }
  const genericSections: HomeSection[] = [];
  for (const raw of Array.isArray(home?.genericBelowHero) ? home.genericBelowHero : []) {
    const mapped = await section(raw, '');
    if (mapped.heading || mapped.text?.length || mapped.media?.length) {
      genericSections.push(mapped);
    }
  }
  const feedback = sectionObject(home?.feedback);
  const props: HomeProps = {
    siteTitle: SITE_TITLE,
    hero: {
      ...(await section(home?.hero, SITE_TITLE)),
      image: await heroImage(),
    },
    genericSections,
    conditions: {
      ...(await section(home?.conditions, 'Learn more about the conditions we treat.')),
      items: conditions,
    },
    blogs: { ...(await section(home?.blog, 'Blog')), items: blogs },
    providers: {
      ...(await section(home?.providers, 'Meet the team')),
      items: providers,
    },
    serviceUpdates: {
      ...(await section(home?.serviceUpdates, 'Service Updates')),
      items: serviceUpdates,
    },
    feedback: {
      averageRating: {
        rating: typeof feedback?.rating === 'number' ? feedback.rating : 0,
        source: { name: text(feedback?.sourceName), url: text(feedback?.sourceUrl) },
        date: text(feedback?.accessDate),
      },
      reviews,
    },
    contact: await section(home?.contact, 'Contact Us'),
    clinicOptions,
    locations: { ...(await section(home?.locations, 'Practices')), practices },
  };
  return { props, description: home?.metaDescription || '' };
}
