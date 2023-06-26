import React, {useEffect, useMemo, useRef, useState} from "react";
import {stylesScreenReaderText} from "../../styles/accessibility";
import {AverageRating} from "./star-rating";
import {ReviewsSection} from "./reviews";

interface PatientFeedbackProps {
    className?: string
}
export const PatientFeedback: React.FC<PatientFeedbackProps> = ({className}) => {
    const sectionRef = useRef<HTMLElement | null>(null);
    const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
    const [enable, setEnable] = useState(false);

    const observerOptions: IntersectionObserverInit = {
        rootMargin: '0px',
        threshold: 0.25,
    }
    const observerCallback: IntersectionObserverCallback = (entries, observer) => {
        entries.forEach((entry) => {
            setEnable(entry.isIntersecting && entry.intersectionRatio > observerOptions.threshold);
        });
    }

    useEffect(() => {
        if(sectionRef.current !== null) {
            if (intersectionObserverRef.current === null) {
                intersectionObserverRef.current = new IntersectionObserver(observerCallback, observerOptions);
                intersectionObserverRef.current?.observe(sectionRef.current as HTMLElement)

                return () => {
                    if (intersectionObserverRef.current) {
                        (intersectionObserverRef.current as IntersectionObserver).disconnect();
                        intersectionObserverRef.current = null;
                    }
                }
            }
        }
    }, [sectionRef, intersectionObserverRef]);

    const source = {
        url: "https://www.healthgrades.com/group-directory/il-illinois/aurora/allergy-asthma-and-sinus-centers-aurora-oyyn35r",
        name: "Healthgrades"
    }
    return (
        <section ref={sectionRef} className={className}>
            <h2 css={stylesScreenReaderText}>Patient Feedback</h2>
            <AverageRating rating={0.98} source={source} date={"July 2020"} enabled={enable}/>
        </section>
    );
}