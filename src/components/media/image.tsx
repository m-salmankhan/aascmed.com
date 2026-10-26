import React from "react";
import type { ImgHTMLAttributes } from "react";
import { css } from "@emotion/react";
import type { Interpolation, Theme } from "@emotion/react";
import type { MediaDescriptor } from "../../shared/content/models";

/** Shared image renderer inputs: a plain media descriptor plus normal image attributes. */
export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "alt" | "width" | "height"> {
  image: MediaDescriptor;
  /** Alternative text override; an explicit empty value marks a decorative image. */
  alt?: string;
  /** CSS object-fit behavior used when the image fills its layout box. */
  fit?: "cover" | "contain" | "fill";
  css?: Interpolation<Theme>;
}

/** Render responsive image data as an `<img>` or `<picture>` element.
 * @param props Shared media descriptor, optional alt/fit overrides, and image attributes.
 * @returns An image element, or a picture element with its alternate encodings.
 */
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
    {image.formats.map((format) => <source key={format.type} type={format.type} srcSet={format.srcSet} sizes={props.sizes || format.sizes || image.sizes} />)}
    {imageNode}
  </picture>;
}

/** Render an image eagerly with cover fitting for prominent hero media.
 * @param props Image descriptor and supported image attributes.
 * @returns The shared image renderer with eager loading and cover fit defaults.
 */
export function HeroImage({ image, ...props }: ImageProps) {
  return <Image {...props} image={image} fit={props.fit || "cover"} loading="eager" fetchPriority="high" />;
}
