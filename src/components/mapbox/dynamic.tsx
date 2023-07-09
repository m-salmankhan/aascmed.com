import { css } from "@emotion/react";
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { MapBoxProps } from ".";
import { colours } from "../../styles/theme";
import { stylesH5 } from "../headings";
import { Logo } from "../logo";
import { StaticMap } from "./static";

mapboxgl.accessToken = process.env["GATSBY_MAPBOX_API_KEY"] || "";

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

    const popup = new mapboxgl.Popup({ maxWidth: "50%", })
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
        if (!jsEnabled) return; // no way to show the interactive map without JS
        if (map.current) return; // initialize map only once
        if (!mapContainer.current) return; // requires container to be initialised

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

        new mapboxgl.Marker({ color: '#1C5E38' })
            .setLngLat([props.longitude, props.latitude])
            .setPopup(addPopup(props.label, mapboxMap, props.longitude, props.latitude))
            .addTo(mapboxMap);

    }, [map, mapContainer, setLng, setLat, setZoom, jsEnabled]);

    if (jsEnabled) {
        return (
            <div className={props.className} css={css({ height: "30em" })}>
                <div ref={mapContainer} className={'map-container'} css={{ height: "100%" }} />
            </div>
        );
    }

    return (
        <StaticMap {...props} />
    )
}

