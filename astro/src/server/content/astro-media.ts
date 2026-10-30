// Adapts Astro's native responsive image results for the shared React image component.
import { getImage, inferRemoteSize, type RemoteImageProps } from 'astro:assets';
import type { MediaDescriptor } from '../../../../src/shared/content/models.ts';

/** Native layout inputs plus the existing view's optional thumbnail crop. */
export interface ResponsiveMediaOptions extends Pick<RemoteImageProps, 'layout' | 'sizes'> {
  /** Intended display width, rather than the original upload's pixel width. */
  width: number;
  aspectRatio?: number;
}

/** Prepare a React image descriptor using Astro's layout, candidate and transform machinery.
 * @param media CMS source URL, alternative text and intrinsic dimensions.
 * @param options Intended display width, native layout/sizes and optional crop ratio.
 * @returns Native responsive URLs; Astro generates build assets or serves SSR transforms.
 */
export async function getResponsiveMediaDescriptor(
  media: MediaDescriptor,
  options: ResponsiveMediaOptions,
): Promise<MediaDescriptor> {
  if (
    media.mimeType === 'image/svg+xml' ||
    new URL(media.src).pathname.toLowerCase().endsWith('.svg')
  ) {
    const svg = await getImage({ src: media.src, inferSize: true, format: 'svg' });
    return { ...media, src: svg.src, width: svg.options.width, height: svg.options.height };
  }
  const cropRatio = options.aspectRatio;
  if (cropRatio !== undefined && (!Number.isFinite(cropRatio) || cropRatio <= 0)) {
    throw new Error('Image aspect ratio must be a positive finite number');
  }
  const dimensions =
    media.width && media.height
      ? { width: media.width, height: media.height }
      : await inferRemoteSize(media.src);
  const ratio = cropRatio ?? dimensions.width / dimensions.height;
  // A crop must fit both source dimensions; Astro owns the responsive density variants.
  const width = Math.min(options.width, dimensions.width, dimensions.height * ratio);
  const height = Math.round(width / ratio);
  const jpeg = await getImage({
    src: media.src,
    width,
    height,
    inferSize: true,
    layout: options.layout ?? 'constrained',
    sizes: options.sizes ?? 'auto',
    fit: options.aspectRatio ? 'cover' : 'inside',
    format: 'jpg',
    quality: 'high',
  });
  // Reuse Astro's validated candidate options for alternate encodings, without re-probing.
  const [avif, webp] = await Promise.all(
    (['avif', 'webp'] as const).map((format) => getImage({ ...jpeg.options, format })),
  );
  return {
    ...media,
    src: jpeg.src,
    width: jpeg.attributes.width,
    height: jpeg.attributes.height,
    mimeType: 'image/jpeg',
    srcSet: jpeg.srcSet.attribute,
    sources: jpeg.srcSet.values.map(({ url, transform }) => ({
      src: url,
      width: transform.width ?? width,
    })),
    sizes: jpeg.attributes.sizes,
    formats: [
      { type: 'image/avif', srcSet: avif.srcSet.attribute },
      { type: 'image/webp', srcSet: webp.srcSet.attribute },
    ],
    aspectRatio: jpeg.attributes.width / jpeg.attributes.height,
  };
}
