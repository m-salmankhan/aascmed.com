export interface MapBoxProps {
    className?: string
    longitude: number
    latitude: number
    label: string
    alt?: string
    width?: number
    inView?: boolean
    zoom: number
    /** Public token supplied by Astro; Gatsby continues to use its existing public config. */
    mapboxAccessToken?: string
}

