import { css, Global } from "@emotion/react"
import { useState, useId, useRef, useEffect } from "react"
import { MapBoxProps } from "."

interface StaticMapBoxParameters {
    label: string
    longitude: number
    latitude: number
    width: number
    height: number
    retina: boolean
    zoom: number
}
const mapSrc = ({ label, latitude, longitude, width, height, retina, zoom }: StaticMapBoxParameters) =>
    `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-l-${label}+1C5E38(${longitude},${latitude})/${longitude},${latitude},${zoom},0/${width}x${height}${retina ? "@2x" : ""}?access_token=${process.env.GATSBY_MAPBOX_API_KEY}`;

enum ImageState {
    INITIAL = "init",
    LOADED = "loaded",
    COMPLETED = "completed"
}

const stylesStaticMap = css`
  height: 100%;
  
  .lazy-container {
    position: relative;
    height: 100%;
    
    img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
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
    const [loaded, setLoaded] = useState(ImageState.INITIAL);
    const id = useId();

    const unBlurImage = () => {
        setLoaded(ImageState.LOADED);
    }

    const removePreviewImg = () => {
        setLoaded(ImageState.COMPLETED);
    }

    const imageRef = useRef<HTMLImageElement | null>(null);
    useEffect(() => {
        if (!imageRef.current) return;

        if (imageRef.current.complete) {
            unBlurImage();
        }
    }, [imageRef, unBlurImage]);


    const previewSrc = "/assets/map-lazy.jpg";

    const baseParameters: StaticMapBoxParameters = {
        width: 600,
        height: 400,
        label: props.label[0].toLocaleLowerCase(),
        longitude: props.longitude,
        latitude: props.latitude,
        retina: false,
        zoom: props.zoom,
    }

    const image = {
        src: mapSrc({ ...baseParameters, width: 600, height: 400 }),
        srcset:
            `${mapSrc({ ...baseParameters, width: 200, height: 133 })} 200w,
            ${mapSrc({ ...baseParameters, width: 300, height: 200 })} 300w,
            ${mapSrc({ ...baseParameters, width: 400, height: 267 })} 400w,
            ${mapSrc({ ...baseParameters, width: 400, height: 267, retina: true })} 800w,
            ${mapSrc({ ...baseParameters, width: 600, height: 400, retina: true })} 1200w, `,
        sizes: `min-width(60em) ${props.width}vw, 90vw`,
    }

    return (
        <div className={props.className} css={css(stylesStaticMap)}>
            <noscript>
                <Global styles={css`#${id} { display: none; }`} />
                <img alt={props.alt} src={image.src} srcSet={image.srcset} sizes={image.sizes} />
            </noscript>
            <div id={id} className={`lazy-container`}>
                {
                    (props.inView === undefined ? true : props.inView) &&
                    <img ref={ } onLoad={unBlurImage} className={`map ${loaded}`} src={image.src} srcSet={image.srcset} alt={props.alt} sizes={image.sizes} />
                }
                {
                    loaded !== ImageState.COMPLETED &&
                    <img className={`lazy-preview ${loaded}`} src={previewSrc} alt={props.alt} onTransitionEnd={removePreviewImg} />
                }
            </div>
        </div>
    )
}