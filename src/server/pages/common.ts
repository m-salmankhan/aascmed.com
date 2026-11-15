// Loads shared page settings and chooses the server-controlled publication state.
import { getAnnouncement, getTrackingInfo } from '../content/loaders';
import { prepareInlineImages } from '../content/inline-images';
import type { ContentMode } from '../content/strapi';

export function isStaticTarget(): boolean {
  return import.meta.env.PUBLIC_ASTRO_TARGET === 'static';
}

/** Select the configured publication state; static output always uses published content.
 * @returns Published mode or draft mode for an explicitly configured SSR deployment.
 */
export function pageContentMode(): ContentMode {
  return !isStaticTarget() && process.env.ASTRO_CONTENT_MODE === 'draft'
    ? 'draft'
    : 'published';
}

/** Load site-wide announcement and analytics records for the selected page request.
 * @param mode Published or protected preview publication state.
 * @returns Serializable settings consumed by the shared page and document.
 */
async function loadPageSettings(mode: ContentMode) {
  const [announcement, trackingSettings] = await Promise.all([
    getAnnouncement(mode),
    getTrackingInfo(mode),
  ]);
  await prepareInlineImages(announcement, mode, 1200);
  return { announcement, trackingSettings };
}

let buildSettings: ReturnType<typeof loadPageSettings> | undefined;

export function getPageSettings(mode: ContentMode) {
  if (isStaticTarget() && mode !== 'published')
    throw new Error('Static pages require published settings');
  if (!import.meta.env.PROD || !isStaticTarget()) return loadPageSettings(mode);
  return (buildSettings ??= loadPageSettings('published').catch((error) => {
    buildSettings = undefined;
    throw error;
  }));
}

/** Shared document and hydrated-view context for every content route. */
export async function getPageContext(pathname: string, mode: ContentMode) {
  const settings = await getPageSettings(mode);
  return {
    document: { pathname, trackingSettings: settings.trackingSettings },
    view: { pathname, announcement: settings.announcement },
  };
}
