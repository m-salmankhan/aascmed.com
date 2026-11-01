export interface MapBoxProps {
    className?: string
    longitude: number
    latitude: number
    label: string
    alt?: string
    width?: number
    /** Responsive image widths for static maps, including layout breakpoints. */
    sizes?: string
    inView?: boolean
    zoom: number
}

