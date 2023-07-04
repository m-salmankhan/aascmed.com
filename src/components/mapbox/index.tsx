import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';

import ReactDOM from "react-dom";
import React, {useEffect, useId, useRef, useState} from "react";
import {Logo} from "../logo";
import {stylesH5} from "../headings";
import {css} from "@emotion/react";
import {colours} from "../../styles/theme";
import {Global} from "@emotion/react";

mapboxgl.accessToken = process.env["GATSBY_MAPBOX_API_KEY"] || "";

export interface MapBoxProps {
    className?: string
    longitude: number
    latitude: number
    label: string
    alt?: string
    width?: number
    inView?: boolean
    zoom: number
}

interface StaticMapBoxParameters {
    label: string
    longitude: number
    latitude: number
    width: number
    height: number
    retina: boolean
    zoom: number
}
const mapSrc = ({label, latitude, longitude, width, height, retina, zoom}: StaticMapBoxParameters) =>
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
      opacity: ${(imageState===ImageState.LOADED) ? 0 : 1};
    }
    
    img.map {
      filter: ${(imageState===ImageState.LOADED) ? "none" : "inherit"};
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
        src: mapSrc({ ...baseParameters, width: 600, height: 400}),
        srcset:
            `${mapSrc({ ...baseParameters, width: 200, height: 133})} 200w,
            ${mapSrc({ ...baseParameters, width: 300, height: 200})} 300w,
            ${mapSrc({ ...baseParameters, width: 400, height: 267})} 400w,
            ${mapSrc({ ...baseParameters, width: 400, height: 267, retina: true})} 800w,
            ${mapSrc({ ...baseParameters, width: 600, height: 400, retina: true})} 1200w, `,
        sizes: `max-width(60em) 90vw, ${props.width}vw`,
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


const stylesMapPopUp = css`
  text-align: center;
  padding: 1em;
  
  svg {
    fill: ${colours.brandPrimary};
    width: 10em;
    height: 10em;
  }
`;

function addPopup(label: string, mapboxMap: mapboxgl.Map, longitude: number, latitude: number): mapboxgl.Popup {
    const element = document.createElement('div');
    ReactDOM.render(
        <div css={stylesMapPopUp}>
            <Logo />
            <div css={stylesH5}>{label}</div>
        </div>
        , element);

    const popup = new mapboxgl.Popup({maxWidth: "50%",})
        .addTo(mapboxMap)
        .setLngLat([longitude, latitude])
        .setDOMContent(element);

    return popup;
}

export const MapBox: React.FC<MapBoxProps> = (props) => {
    const [jsEnabled, setJsEnabled] = useState(false);
    useEffect(() => {
        setJsEnabled(true);
    }, [jsEnabled]);

    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const [lng, setLng] = useState(props.longitude);
    const [lat, setLat] = useState(props.latitude);
    const [zoom, setZoom] = useState(props.zoom);


    useEffect(() => {
        if(!jsEnabled) return; // no way to show the interactive map without JS
        if (map.current) return; // initialize map only once
        if(!mapContainer.current) return; // requires container to be initialised

        const mapboxMap = new mapboxgl.Map({
            container: mapContainer.current as HTMLElement,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: zoom
        });
        map.current = mapboxMap;

        mapboxMap.on('move', () => {
            setLng(parseFloat(mapboxMap.getCenter().lng.toFixed(4)));
            setLat(parseFloat(mapboxMap.getCenter().lat.toFixed(4)));
            setZoom(parseFloat(mapboxMap.getZoom().toFixed(2)));
        });

        new mapboxgl.Marker({color: '#1C5E38'})
            .setLngLat([props.longitude, props.latitude])
            .setPopup(addPopup(props.label, mapboxMap, props.longitude, props.latitude))
            .addTo(mapboxMap);

    }, [map, mapContainer, setLng, setLat, setZoom, jsEnabled]);

    if(jsEnabled) {
        return (
            <div className={props.className} css={css({height: "30em"})}>
                <div ref={mapContainer} className={'map-container'} css={{height: "100%"}} />
            </div>
        );
    }

    return (
        <StaticMap {...props} />
    )
}

