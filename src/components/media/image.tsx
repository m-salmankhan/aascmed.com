import React from "react";
import type { ImgHTMLAttributes } from "react";
import type { MediaDescriptor } from "../../shared/content/models";

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt" | "width" | "height"> {
  image: MediaDescriptor;
  /** An explicit empty string preserves decorative image semantics. */
  alt?: string;
}

/** Render a plain JSON image descriptor; safe to use in Gatsby or Astro React views. */
export function Image({ image, alt, loading = "lazy", decoding = "async", ...props }: ImageProps) {
  const srcSet = image.sources?.length
    ? image.sources.map(({ src, width }) => `${src} ${width}w`).join(", ")
    : image.srcSet;
  const width = image.width ?? image.sources?.at(-1)?.width;
  const computedSizes = props.sizes || (image.sources?.length ? "100vw" : undefined);
  return <img
    {...props}
    src={image.src}
    srcSet={srcSet}
    sizes={computedSizes}
    alt={alt ?? image.alt}
    width={width}
    height={image.height}
    loading={loading}
    decoding={decoding}
  />;
}

/** Image renderer suitable for hero/background media slots. */
export function HeroImage({ image, ...props }: ImageProps) {
  return <Image {...props} image={image} loading="eager" fetchPriority="high" />;
}

