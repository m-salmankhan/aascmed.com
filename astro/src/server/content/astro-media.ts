// Turns CMS media descriptors into responsive files through Astro's configured image service.
import { getImage } from 'astro:assets';
import type { MediaDescriptor } from '../../../../src/shared/content/models.ts';

const RESPONSIVE_WIDTHS = [320, 640, 960, 1280];

/** Generate responsive JPEG and modern-format candidates during an Astro page render.
 * @param media Original CMS media URL, alternative text and any known intrinsic dimensions.
 * @returns A serializable descriptor with Astro-generated URLs, or the original descriptor for SVG inputs.
 */
export async function getResponsiveMediaDescriptor(
  media: MediaDescriptor,
): Promise<MediaDescriptor> {
  if (!media.src) {
    return media;
  }
  if (
    media.mimeType === 'image/svg+xml' ||
    new URL(media.src, 'https://media.invalid').pathname
      .toLowerCase()
      .endsWith('.svg')
  ) {
    return media;
  }
  const inferred = /^https?:\/\//i.test(media.src)
    ? await getImage({ src: media.src, inferSize: true, format: 'jpg' })
    : undefined;
  const width = inferred?.options.width ?? media.width;
  const height = inferred?.options.height ?? media.height;
  if (!width || !height) {
    throw new Error('Astro could not determine public image dimensions');
  }
  const widths = [
    ...RESPONSIVE_WIDTHS.filter((candidate) => candidate < width),
    width,
  ];
  const imageOptions = {
    src: media.src,
    widths,
    width,
    height,
    fit: 'inside' as const,
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
