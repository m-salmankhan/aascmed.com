import { css } from "@emotion/react"
import { useState, useId, useRef, useEffect, useCallback } from "react"
import { MapBoxProps } from "."
import { usePublicConfig } from "../../config/public-context";

interface StaticMapBoxParameters {
    label: string
    longitude: number
    latitude: number
    width: number
    height: number
    retina: boolean
    zoom: number
    accessToken: string
}
const mapSrc = ({ label, latitude, longitude, width, height, retina, zoom, accessToken }: StaticMapBoxParameters) => {
    const pinLabel = /^[a-z0-9]$/i.test(label[0] || '') ? `-${label[0].toLowerCase()}` : '';
    return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l${pinLabel}+1C5E38(${longitude},${latitude})/${longitude},${latitude},${zoom},0/${width}x${height}${retina ? "@2x" : ""}?access_token=${accessToken}`;
};

enum ImageState {
    INITIAL = "init",
    LOADED = "loaded",
    COMPLETED = "completed"
}

const stylesStaticMap = css`
  height: 100%;

  &.noscript {
    img.init {
        visibility: hidden;
    }
  }
  
  .lazy-container {
    position: relative;
    height: 100%;
    
    img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      transition: opacity .5s ease 0s, filter .5s ease 0s;
      filter: blur(20px);
      display: block;
      object-fit: cover;
    }
    
    img.lazy-preview {
        opacity: 1;

        &.loaded {
            opacity: 0;
        }
    }
    
    img.map {
      filter: inherit;
      &.loaded {
        filter: none;
      }
    }
  }
`;

export const StaticMap: React.FC<MapBoxProps> = (props) => {
    const { mapboxAccessToken } = usePublicConfig();
    const [loaded, setLoaded] = useState(ImageState.INITIAL);
    const id = useId();

    const unBlurImage = useCallback(() => {
        setLoaded(ImageState.LOADED);
    }, []);

    const removePreviewImg = () => {
        setLoaded(ImageState.COMPLETED);
    }

    const imageRef = useRef<HTMLImageElement | null>(null);
    useEffect(() => {
        if (!imageRef.current) return;

        if (imageRef.current.complete && imageRef.current.naturalWidth > 0) {
            unBlurImage();
        }
    }, [unBlurImage, props.inView]);


    const previewSrc = "/assets/map-lazy.jpg";

    const baseParameters: StaticMapBoxParameters = {
        width: 600,
        height: 400,
        label: props.label,
        longitude: props.longitude,
        latitude: props.latitude,
        retina: false,
        zoom: props.zoom,
        accessToken: mapboxAccessToken,
    }

    const image = {
        src: mapSrc({ ...baseParameters, width: 600, height: 400 }),
        srcset:
            `${mapSrc({ ...baseParameters, width: 200, height: 133 })} 200w,
            ${mapSrc({ ...baseParameters, width: 300, height: 200 })} 300w,
            ${mapSrc({ ...baseParameters, width: 400, height: 267 })} 400w,
            ${mapSrc({ ...baseParameters, width: 400, height: 267, retina: true })} 800w,
            ${mapSrc({ ...baseParameters, width: 600, height: 400, retina: true })} 1200w, `,
        sizes: props.sizes ?? `(min-width: 60em) ${props.width ?? 90}vw, 90vw`,
    }

    return (
        <div className={[props.className, "noscript"].filter(Boolean).join(" ")} css={css(stylesStaticMap)}>
            <noscript>
                <div className="lazy-container">
                    <img loading="lazy" decoding="async" alt={props.alt} className={`map ${ImageState.COMPLETED}`} src={image.src} srcSet={image.srcset} sizes={image.sizes} />
                </div>
            </noscript>
            <div id={id} className={`lazy-container`}>
                {
                    (props.inView === undefined ? true : props.inView) &&
                    <img loading="lazy" decoding="async" ref={imageRef} onLoad={unBlurImage} className={`map ${loaded}`} src={image.src} srcSet={image.srcset} alt={props.alt} sizes={image.sizes} />
                }
                {
                    loaded !== ImageState.COMPLETED &&
                    <img loading="lazy" decoding="async" className={`lazy-preview ${loaded}`} src={previewSrc} alt={props.alt} onTransitionEnd={removePreviewImg} />
                }
            </div>
        </div>
    )
}
