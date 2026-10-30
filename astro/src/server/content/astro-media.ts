// Turns CMS media descriptors into responsive files through Astro's configured image service.
import { getImage } from 'astro:assets';
import type { MediaDescriptor } from '../../../../src/shared/content/models.ts';
const MAX_IMAGE_WIDTH = 1920;
const RESPONSIVE_WIDTHS = [320, 640, 960, 1280, MAX_IMAGE_WIDTH];
// Lazy images use their actual layout slot; older browsers use the bounded fallback.
const RESPONSIVE_SIZES = 'auto, (min-width: 1280px) 1280px, 100vw';
/** Generate responsive JPEG and modern-format candidates during an Astro page render.
 * @param media Original CMS media URL, alternative text and any known intrinsic dimensions.
 * @param aspectRatio Optional output width-to-height ratio for cropped thumbnails.
 * @returns Native responsive output bounded to 1920 pixels, with layout-aware lazy selection; SVG inputs pass through.
 */
export async function getResponsiveMediaDescriptor(
  media: MediaDescriptor,
  aspectRatio?: number,
): Promise<MediaDescriptor> {
  if (aspectRatio !== undefined && (!Number.isFinite(aspectRatio) || aspectRatio <= 0)) {
    throw new Error('Image aspect ratio must be a positive finite number');
  }
  if (!media.src) {
    return media;
  }
  if (
    media.mimeType === 'image/svg+xml' ||
    new URL(media.src, 'https://media.invalid').pathname.toLowerCase().endsWith('.svg')
  ) {
    return media;
  }
  const inferred =
    !media.width || !media.height
      ? await getImage({ src: media.src, inferSize: true, format: 'jpg' })
      : undefined;
  const sourceWidth = inferred?.options.width ?? media.width;
  const sourceHeight = inferred?.options.height ?? media.height;
  if (!sourceWidth || !sourceHeight) {
    throw new Error('Astro could not determine public image dimensions');
  }
  // Keep the crop inside both source dimensions so Astro does not need to upscale.
  const cropWidth = aspectRatio
    ? Math.max(1, Math.min(sourceWidth, Math.round(sourceHeight * aspectRatio)))
    : sourceWidth;
  const width = Math.min(cropWidth, MAX_IMAGE_WIDTH);
  const ratio = aspectRatio || sourceWidth / sourceHeight;
  const height = Math.max(1, Math.round(width / ratio));
  const widths = [...RESPONSIVE_WIDTHS.filter((candidate) => candidate < width), width];
  const imageOptions = {
    src: media.src,
    widths,
    width,
    height,
    fit: aspectRatio ? ('cover' as const) : ('inside' as const),
    quality: 'high' as const,
  };
  const [jpeg, avif, webp] = await Promise.all([
    getImage({ ...imageOptions, format: 'jpg' }),
    getImage({ ...imageOptions, format: 'avif' }),
    getImage({ ...imageOptions, format: 'webp' }),
  ]);
  const jpegCandidates = jpeg.srcSet.values;
  const lastJpeg = jpegCandidates.at(-1);
  if (!lastJpeg) {
    throw new Error('Astro could not generate a public JPEG candidate');
  }
  return {
    ...media,
    src: lastJpeg.url,
    width,
    height,
    mimeType: 'image/jpeg',
    sizes: media.sizes || RESPONSIVE_SIZES,
    srcSet: jpeg.srcSet.attribute,
    sources: jpegCandidates.map(({ url, transform }) => ({
      src: url,
      width: transform.width ?? width,
    })),
    formats: [
      { type: 'image/avif', srcSet: avif.srcSet.attribute },
      { type: 'image/webp', srcSet: webp.srcSet.attribute },
    ],
    aspectRatio: width / height,
  };
}
