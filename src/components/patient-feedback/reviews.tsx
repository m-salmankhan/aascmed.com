import ReactMarkdown from "react-markdown";
import React, {useEffect, useState} from "react";
import {css} from "@emotion/react";
import {colours} from "../../styles/theme";

export interface Review {
    body: string,
    stars: number,
    source: {
        url: string,
        name: string,
    }
}

enum SliderPlayState {
    AUTO,
    PAUSED,
    MANUAL,
}

interface ReviewSliderProps {
    className?: string,
    reviews: [Review],
    inViewPort: boolean
}
export const ReviewSlider: React.FC<ReviewSliderProps> = ({className, inViewport}) => {
    const [playState, setPlayState] = useState(SliderPlayState.PAUSED);

    useEffect(() => {
        if(inViewport && playState !== SliderPlayState.MANUAL) {
            setPlayState(SliderPlayState.AUTO);
        } else if(!inViewport) {
            setPlayState(SliderPlayState.PAUSED)
        }
    }, [inViewport, setPlayState()]);

    return (
        // viewport
        <div className={className}>

        </div>
    )
}

const stylesReviewsSection = css({
    background: colours.brandPrimary,
    minHeight: "60vh",
});

interface ReviewsSectionProps {
    className?: string,
    reviews: [Review],
    inViewport: boolean
}
export const ReviewsSection: React.FC<ReviewsSectionProps> = ({className, reviews, inViewport}) => {
    return (
        <section className={className} css={}>
            <ReviewSlider reviews={reviews} inViewPort={inViewport} />
        </section>
    );
}