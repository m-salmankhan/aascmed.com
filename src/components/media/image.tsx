import React from "react";
import type { ImgHTMLAttributes } from "react";
import { css } from "@emotion/react";
import type { Interpolation, Theme } from "@emotion/react";
import type { MediaDescriptor } from "../../shared/content/models";

export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt" | "width" | "height"> {
  image: MediaDescriptor;
  /** An explicit empty string preserves decorative image semantics. */
  alt?: string;
  fit?: "cover" | "contain" | "fill";
  css?: Interpolation<Theme>;
}

/** Render a plain JSON image descriptor; safe to use in Gatsby or Astro React views. */
export function Image({ image, alt, fit, css: callerCss, loading = "lazy", decoding = "async", ...props }: ImageProps) {
  const srcSet = image.sources?.length
    ? image.sources.map(({ src, width }) => `${src} ${width}w`).join(", ")
    : image.srcSet;
  const width = image.width ?? image.sources?.at(-1)?.width;
  const computedSizes = props.sizes || image.sizes;
  const imageNode = <img
    {...props}
    src={image.src}
    srcSet={srcSet}
    sizes={computedSizes}
    alt={alt ?? image.alt}
    width={width}
    height={image.height}
    loading={loading}
    decoding={decoding}
    css={[callerCss, fit ? { objectFit: fit } : undefined]}
  />;
  if (!image.formats?.length) return imageNode;
  return <picture css={fit ? css({
    display: "block",
    width: "100%",
    height: "100%",
    img: { width: "100%", height: "100%", objectFit: fit },
  }) : undefined}>
    {image.formats.map((format) => <source key={format.type} type={format.type} srcSet={format.srcSet} sizes={format.sizes || computedSizes} />)}
    {imageNode}
  </picture>;
}

/** Image renderer suitable for hero/background media slots. */
export function HeroImage({ image, ...props }: ImageProps) {
  return <Image {...props} image={image} fit={props.fit || "cover"} loading="eager" fetchPriority="high" />;
}

