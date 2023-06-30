import React, {useEffect, useRef, useState} from "react";
import {MapBox, StaticMap} from "../mapbox";

interface PracticeArchiveListProps {
    className?: string
}
export const PracticeArchiveList: React.FC<PracticeArchiveListProps> = (props) => {
    const [inView, setInView] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const componentRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if(componentRef.current === null) return;
        if(observerRef.current !== null) return;

        const observer = new IntersectionObserver((entries, observer) => {
            if(entries[0].isIntersecting) {
                setInView(true);
                observer.unobserve(entries[0].target);
            }
        });

        observerRef.current = observer;
        observer.observe(componentRef.current);

    }, [observerRef, componentRef, setInView]);

    return (
        <div className={props.className} ref={componentRef}>
        </div>
    )
}