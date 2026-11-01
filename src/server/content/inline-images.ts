// Prepares embedded CMS image blocks with Astro before the shared React renderer runs.
import { createClient, type ContentMode } from './strapi';
import { getResponsiveMediaDescriptor } from './astro-media';

/** Replace rich-text image URLs with native responsive output in a page's content data.
 * @param content Normalized page data, including nested blocks, sections or FAQ answers.
 * @param mode Publication state used to resolve relative uploads against the configured CMS.
 * @param width Intended display width of images in this content region.
 * @returns Nothing; updates the page's existing data before it is passed to React.
 */
export async function prepareInlineImages(
  content: unknown,
  mode: ContentMode,
  width: number,
): Promise<void> {
  if (!content || typeof content !== 'object') {
    return;
  }
  if (Array.isArray(content)) {
    for (const child of content) {
      await prepareInlineImages(child, mode, width);
    }
    return;
  }
  const block = content as Record<string, unknown>;
  if (block.type === 'image' && block.image && typeof block.image === 'object') {
    const image = block.image as Record<string, unknown>;
    if (typeof image.url !== 'string') {
      return;
    }
    const origin = new URL(createClient(mode).baseURL).origin;
    const prepared = await getResponsiveMediaDescriptor(
      {
        src: new URL(image.url, origin).href,
        alt: typeof image.alternativeText === 'string' ? image.alternativeText : '',
        width: typeof image.width === 'number' ? image.width : undefined,
        height: typeof image.height === 'number' ? image.height : undefined,
        mimeType: typeof image.mime === 'string' ? image.mime : undefined,
      },
      { width },
    );
    image.url = prepared.src;
    image.width = prepared.width;
    image.height = prepared.height;
    image.responsive = {
      srcSet: prepared.srcSet,
      sizes: prepared.sizes,
      formats: prepared.formats,
    };
    return;
  }
  for (const child of Object.values(block)) {
    await prepareInlineImages(child, mode, width);
  }
}
