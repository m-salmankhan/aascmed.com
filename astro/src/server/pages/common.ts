// Loads shared page settings and chooses the server-controlled publication state.
import { getAnnouncement, getTrackingInfo } from '../content/loaders';
import { prepareInlineImages } from '../content/inline-images';
import type { ContentMode } from '../content/strapi';

/** Select the configured publication state; static output always uses published content.
 * @returns Published mode or draft mode for an explicitly configured SSR deployment.
 */
export function pageContentMode(): ContentMode {
  return import.meta.env.PUBLIC_ASTRO_TARGET !== 'static' &&
    process.env.ASTRO_CONTENT_MODE === 'draft'
    ? 'draft'
    : 'published';
}

/** Load site-wide announcement and analytics records for the selected page request.
 * @param mode Published or protected preview publication state.
 * @returns Serializable settings consumed by the shared page and document.
 */
export async function getPageSettings(mode: ContentMode) {
  const [announcement, trackingSettings] = await Promise.all([
    getAnnouncement(mode),
    getTrackingInfo(mode),
  ]);
  await prepareInlineImages(announcement, mode, 1200);
  return { announcement, trackingSettings };
}
