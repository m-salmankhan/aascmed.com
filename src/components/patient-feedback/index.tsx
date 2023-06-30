import React, {useEffect, useRef, useState} from "react";
import {stylesScreenReaderText} from "../../styles/accessibility";
import {AverageRating} from "./star-rating";
import {Review, ReviewsSection} from "./reviews";

interface PatientFeedbackProps {
    className?: string
    averageRating: {
        rating: number
        source: {
            name: string
            url: string
        }
        date: string
    }
    reviews: Review[]
}

export const PatientFeedback: React.FC<PatientFeedbackProps> = ({className, averageRating,reviews}) => {
    const sectionRef = useRef<HTMLElement | null>(null);
    const intersectionObserverRef = useRef<IntersectionObserver | null>(null);
    const [enable, setEnable] = useState(false);

    const observerOptions: IntersectionObserverInit = {
        rootMargin: '0px',
        threshold: 0.25,
    }
    const observerCallback: IntersectionObserverCallback = (entries) => {
        entries.forEach((entry) => {
            setEnable(entry.isIntersecting && entry.intersectionRatio > (observerOptions.threshold as number));
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

    return (
        <section ref={sectionRef} className={className}>
            <h2 css={stylesScreenReaderText}>Patient Feedback</h2>
            <AverageRating rating={averageRating.rating} source={averageRating.source} date={averageRating.date} enabled={enable}/>
            {
                reviews.length > 1 && <ReviewsSection reviews={reviews as [Review]} inViewport={enable} />
            }
        </section>
    );
}