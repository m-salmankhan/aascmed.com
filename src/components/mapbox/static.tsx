import { css, Global } from "@emotion/react"
import { useState, useId } from "react"
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
    INITIAL,
    LOADED,
    COMPLETED
}

const stylesStaticMap = (imageState: ImageState) => css`
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
      opacity: ${(imageState === ImageState.LOADED) ? 0 : 1};
    }
    
    img.map {
      filter: ${(imageState === ImageState.LOADED) ? "none" : "inherit"};
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
        <div className={props.className} css={css(stylesStaticMap(loaded))}>
            <noscript>
                <Global styles={css`#${id} { display: none; }`} />
                <img alt={props.alt} src={image.src} srcSet={image.srcset} sizes={image.sizes} />
            </noscript>
            <div id={id} className={"lazy-container"}>
                {
                    (props.inView === undefined ? true : props.inView) &&
                    <img className={"map"} src={image.src} srcSet={image.srcset} alt={props.alt} sizes={image.sizes} onLoad={unBlurImage} />
                }
                {
                    loaded !== ImageState.COMPLETED &&
                    <img className={"lazy-preview"} src={previewSrc} alt={props.alt} onTransitionEnd={removePreviewImg} />
                }
            </div>
        </div>
    )
}