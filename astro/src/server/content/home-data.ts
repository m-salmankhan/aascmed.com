import type { HomeViewProps, HomeMediaItem, HomeSection } from '../../../../src/views/home.tsx';
import type {
  BlogRecord, ClinicRecord, ConditionRecord, HomePageRecord, JsonValue,
  MediaDescriptor, ProviderRecord, ReviewRecord, ServiceUpdateRecord,
} from '../../../../src/shared/content/models.ts';
import type { PublishedContentSnapshot } from './loaders.ts';
import { blogPath, clinicPath, conditionPath, providerPath, serviceUpdatePath } from '../../../../src/shared/content/urls.ts';

const DEFAULT_SITE_TITLE = 'Allergy, Asthma and Sinus Centers';
const SECTION_FALLBACKS = {
  conditions: 'Learn more about the conditions we treat.',
  blog: 'Blog',
  providers: 'Meet the team',
  serviceUpdates: 'Service Updates',
  contact: 'Contact Us',
  locations: 'Practices',
} as const;

export type HomeCollections = Pick<PublishedContentSnapshot, 'blogs' | 'clinics' | 'conditions' | 'providers' | 'reviews' | 'serviceUpdates'>;

type JsonObject = { [key: string]: JsonValue };

function object(value: JsonValue | undefined): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function textBlocks(value: JsonValue | undefined): JsonValue[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function section(value: JsonValue | undefined, fallback: string): HomeSection {
  const data = object(value);
  const media = Array.isArray(data?.media)
    ? data.media.flatMap((item): HomeMediaItem[] => {
      const image = object(item);
      const descriptor = image && typeof image.src === 'string'
        ? image as unknown as MediaDescriptor
        : undefined;
      const mime = typeof image?.mimeType === 'string' ? image.mimeType : null;
      if (!descriptor || !mime) return [];
      return [{ mime, name: typeof image?.alt === 'string' ? image.alt : undefined, url: descriptor.src, descriptor }];
    })
    : undefined;

  return {
    heading: typeof data?.heading === 'string' && data.heading.trim() ? data.heading : fallback,
    text: textBlocks(data?.text),
    media,
  };
}

function dateForDisplay(date: string | null | undefined): string {
  if (!date) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(date);
  if (!match || !Number.isFinite(Date.parse(date))) return '';
  const instant = new Date(date);
  const day = Number(match[3]);
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] || 'th';
  const month = new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(instant);
  const year = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' }).format(instant);
  return `${day}${suffix} ${month} ${year}`;
}

function homeConditions(records: ConditionRecord[], imageByRoute: Record<string, MediaDescriptor>): HomeViewProps['conditions']['items'] {
  return records.flatMap((condition) => {
    const slug = conditionPath(condition.slug);
    if (!slug) return [];
    const key = slug.split('/').filter(Boolean).at(-1) || '';
    return [{
      slug,
      title: condition.heading || condition.title || '',
      thumbnail: imageByRoute[`condition:${key}`] || condition.thumbnail,
    }];
  }).slice(0, 11);
}

function homeBlogs(records: BlogRecord[]): HomeViewProps['blogs']['items'] {
  return records.flatMap((blog) => {
    const slug = blogPath(blog.slug);
    return slug ? [{ slug, title: blog.title || blog.heading || '', date: dateForDisplay(blog.date), description: blog.description || '' }] : [];
  }).slice(0, 6);
}

function homeProviders(records: ProviderRecord[]): HomeViewProps['providers']['items'] {
  return records.flatMap((provider) => {
    const slug = providerPath(provider.slug);
    if (!slug || provider.retirementNotice?.retired) return [];
    const honorific = provider.name?.honorific;
    return [{
      slug,
      name: {
        fullName: provider.name?.fullName || '',
        title: honorific && honorific !== 'None' ? honorific : '',
        degreeAbbr: provider.name?.qualificationAbbr || '',
      },
      retired: false,
      image: provider.image,
    }];
  });
}

function homeServiceUpdates(records: ServiceUpdateRecord[]): HomeViewProps['serviceUpdates']['items'] {
  return records.flatMap((update) => {
    const slug = serviceUpdatePath(update);
    return slug ? [{ slug, title: update.title || '', date: dateForDisplay(update.date), description: update.description || '' }] : [];
  }).slice(0, 3);
}

function homeReviews(records: ReviewRecord[]): HomeViewProps['feedback']['reviews'] {
  return records.map((review) => ({
    reviewerName: review.name || '',
    body: review.content || null,
    stars: review.stars || 0,
    source: { url: review.sourceUrl || '', name: review.sourceName || '' },
  }));
}

function homeClinics(records: ClinicRecord[]) {
  return records.flatMap((clinic) => {
    const slug = clinicPath(clinic);
    return slug ? [{
      slug,
      clinic_name: clinic.clinicName || 'Untitled Clinic',
      longitude: clinic.location?.longitude || 0,
      latitude: clinic.location?.latitude || 0,
      address: clinic.location?.address || '',
      phone: clinic.contact?.phone || '',
      fax: clinic.contact?.fax || '',
    }] : [];
  });
}

export function buildHomeViewProps(
  homePage: HomePageRecord | null,
  records: HomeCollections,
  options: { siteTitle?: string; conditionImages?: Record<string, MediaDescriptor> } = {},
): HomeViewProps {
  const siteTitle = options.siteTitle || DEFAULT_SITE_TITLE;
  const hero = section(homePage?.hero, siteTitle);
  const genericSections = (Array.isArray(homePage?.genericBelowHero) ? homePage.genericBelowHero : [])
    .map((value) => section(value, ''))
    .filter((value) => value.heading || value.text?.length || value.media?.length);
  const feedback = object(homePage?.feedback);

  return {
    siteTitle,
    hero: { ...hero, heading: hero.heading || siteTitle, image: { src: '/assets/hero-bg.png', alt: '', width: 1920, height: 1080 } },
    genericSections,
    conditions: { ...section(homePage?.conditions, SECTION_FALLBACKS.conditions), items: homeConditions(records.conditions, options.conditionImages || {}) },
    blogs: { ...section(homePage?.blog, SECTION_FALLBACKS.blog), items: homeBlogs(records.blogs) },
    providers: { ...section(homePage?.providers, SECTION_FALLBACKS.providers), items: homeProviders(records.providers) },
    serviceUpdates: { ...section(homePage?.serviceUpdates, SECTION_FALLBACKS.serviceUpdates), items: homeServiceUpdates(records.serviceUpdates) },
    feedback: {
      averageRating: {
        rating: feedback && typeof feedback.rating === 'number' ? feedback.rating : 0,
        source: {
          name: feedback && typeof feedback.sourceName === 'string' ? feedback.sourceName : '',
          url: feedback && typeof feedback.sourceUrl === 'string' ? feedback.sourceUrl : '',
        },
        date: feedback && typeof feedback.accessDate === 'string' ? feedback.accessDate : '',
      },
      reviews: homeReviews(records.reviews),
    },
    contact: section(homePage?.contact, SECTION_FALLBACKS.contact),
    locations: { ...section(homePage?.locations, SECTION_FALLBACKS.locations), practices: homeClinics(records.clinics) },
  };
}
