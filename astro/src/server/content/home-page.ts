import type { SiteData } from '../../../../src/shared/data/site-data.tsx';
import type { ContentMode } from './strapi.ts';
import {
  getBlogs, getClinics, getConditions, getHomePage, getProviders,
  getPublishedBuildSnapshot, getReviews, getServiceUpdates,
} from './loaders.ts';
import { getAstroSiteData } from './route-data.ts';
import { getPublishedImageManifest } from './public-images.ts';
import { buildHomeViewProps, type HomeCollections } from './home-data.ts';

/** SSR collection reads share a small worker pool; no CMS collection fan-out is unbounded. */
async function getDraftHomeCollections(): Promise<HomeCollections> {
  const jobs = [getBlogs, getClinics, getConditions, getProviders, getServiceUpdates, getReviews] as const;
  const values: unknown[][] = Array(jobs.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(3, jobs.length) }, async () => {
    while (next < jobs.length) {
      const index = next++;
      values[index] = await jobs[index]('draft');
    }
  });
  await Promise.all(workers);
  const [blogs, clinics, conditions, providers, serviceUpdates, reviews] = values;
  return { blogs, clinics, conditions, providers, serviceUpdates, reviews } as HomeCollections;
}

export interface AstroHomePageData {
  homePage: Awaited<ReturnType<typeof getHomePage>>;
  siteData: SiteData;
  viewProps: ReturnType<typeof buildHomeViewProps>;
}

/**
 * Static builds share the existing private published snapshot with image/path generation.
 * Draft SSR resolves the same six needed collections with at most three requests in flight.
 */
export async function getAstroHomePageData(mode: ContentMode): Promise<AstroHomePageData> {
  const collections = mode === 'published'
    ? await getPublishedBuildSnapshot()
    : await getDraftHomeCollections();
  const [homePage, baseSiteData, imageManifest] = await Promise.all([
    getHomePage(mode),
    getAstroSiteData(mode),
    mode === 'published' ? getPublishedImageManifest() : Promise.resolve(null),
  ]);
  const siteData: SiteData = {
    ...baseSiteData,
    clinicOptions: collections.clinics.flatMap((clinic) => clinic.clinicName ? [clinic.clinicName] : []),
  };
  const conditionImages = imageManifest?.mediaByRoute
    ? Object.fromEntries(Object.entries(imageManifest.mediaByRoute).filter(([key]) => key.startsWith('condition:')))
    : {};
  return {
    homePage,
    siteData,
    viewProps: buildHomeViewProps(homePage, collections, { siteTitle: siteData.siteSettings.title, conditionImages }),
  };
}
