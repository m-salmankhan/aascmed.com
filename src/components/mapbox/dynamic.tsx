import { css } from "@emotion/react";
import mapboxgl from "mapbox-gl";
import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { MapBoxProps } from ".";
import { colours } from "../../styles/theme";
import { stylesH5 } from "../headings";
import { Logo } from "../logo";
import { StaticMap } from "./static";
import { usePublicConfig } from "../../config/public-context";

const stylesMapPopUp = css`
  text-align: center;
  padding: 1em;
  
  svg {
    fill: ${colours.brandPrimary};
    width: 10em;
    height: 10em;
  }
`;

function addPopup(
    label: string,
    mapboxMap: mapboxgl.Map,
    longitude: number,
    latitude: number,
    popupRoots: Set<ReturnType<typeof createRoot>>,
): mapboxgl.Popup {
    const element = document.createElement('div');
    const root = createRoot(element);
    popupRoots.add(root);
    root.render(
        <div css={stylesMapPopUp}>
            <Logo />
            <div css={stylesH5}>{label}</div>
        </div>
    );

    const popup = new mapboxgl.Popup({ maxWidth: "50%", })
        .addTo(mapboxMap)
        .setLngLat([longitude, latitude])
        .setDOMContent(element);
    return popup;
}

export const MapBox: React.FC<MapBoxProps> = (props) => {
    const { mapboxAccessToken } = usePublicConfig();
    const [jsEnabled, setJsEnabled] = useState(false);
    useEffect(() => {
        setJsEnabled(true);
    }, []);

    const mapContainer = useRef<HTMLDivElement | null>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    // Changing clinic values intentionally recreates the whole GL map.
    useEffect(() => {
        if (!jsEnabled) return; // no way to show the interactive map without JS
        if (map.current) return; // initialize map only once
        if (!mapContainer.current) return; // requires container to be initialised

        const popupRoots = new Set<ReturnType<typeof createRoot>>();
        const mapboxMap = new mapboxgl.Map({
            container: mapContainer.current as HTMLElement,
            accessToken: mapboxAccessToken,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [props.longitude, props.latitude],
            zoom: props.zoom
        });
        map.current = mapboxMap;

        new mapboxgl.Marker({ color: '#1C5E38' })
            .setLngLat([props.longitude, props.latitude])
            .setPopup(addPopup(props.label, mapboxMap, props.longitude, props.latitude, popupRoots))
            .addTo(mapboxMap);

        return () => {
            mapboxMap.remove();
            popupRoots.forEach(root => root.unmount());
            popupRoots.clear();
            map.current = null;
        };
    }, [jsEnabled, mapboxAccessToken, props.longitude, props.latitude, props.zoom, props.label]);

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

