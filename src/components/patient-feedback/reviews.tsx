import React, {CSSProperties, useContext, useEffect, useRef, useState} from "react";
import {css} from "@emotion/react";
import {bounceTransition, colours, gridSpacing} from "../../styles/theme";
import {Container} from "../containers";
import {ButtonBack, ButtonNext, CarouselContext, CarouselProvider, Slide, Slider} from "pure-react-carousel";
import 'pure-react-carousel/dist/react-carousel.es.css';
import {stylesScreenReaderText} from "../../styles/accessibility";
import {FaIcons, IconStyles} from "../font-awesome";
import {H3, stylesH5} from "../headings";
import {cols, gridContainer} from "../../styles/grid";
import {breakpointStrings, mediaBreakpoints} from "../../styles/breakpoints";
import {CSSInterpolation} from "@emotion/serialize";
import {StarIcon, StarStyles} from "./star-rating";

export interface Review {
    reviewerName: string,
    body: string,
    stars: number,
    source: {
        url: string,
        name: string,
    }
}

const stylesReview = css(gridContainer(), {
    width: "100%",
    transition: `max-height .5s ease 0s`,
});
const stylesReviewMetaNoWidths: CSSInterpolation = {
        h3: {
            color: "#fff",
        },

        a: {
            color: "#fff",
        }
};
stylesReviewMetaNoWidths[breakpointStrings.md] = {
    textAlign: "right",
}

const stylesReviewMeta = css(
    cols(10, 0, 10),
    cols(3, mediaBreakpoints.md, 10),
    stylesReviewMetaNoWidths,
);
const stylesQuotationMark: CSSInterpolation = {
    display: "none",

    ".quote": {
        width: "5rem",
        height: "5rem",
        fill: "#fff",
    }
};
stylesQuotationMark[breakpointStrings.md] = {
    display: "block"
}
const stylesReviewBody = css(
    cols(10, 0, 10),
    cols(7, mediaBreakpoints.md, 10),
    {
    },
);

const stylesHideInactiveReview: (active: boolean, height: number) => CSSProperties = (active, height: number) => ({
    maxHeight: active ? `${height}px` : 0,
    overflow: "hidden",
});

interface SliderReviewProps {
    review: Review,
    className?: string,
    number: number
}
const SliderReview: React.FC<SliderReviewProps> = ({className, review, number}) => {
    const carouselContext = useContext(CarouselContext);
    const [currentSlide, setCurrentSlide] = useState(carouselContext.state.currentSlide);
    useEffect(() => {
        function onChange() {
            setCurrentSlide(carouselContext.state.currentSlide);
        }
        carouselContext.subscribe(onChange);
        return () => carouselContext.unsubscribe(onChange);
    }, [carouselContext]);

    const reviewRef = useRef<HTMLElement | null>(null);
    const [height, setHeight] = useState(0);

    useEffect(() => {
        if(reviewRef.current) {
            const el = reviewRef.current as HTMLElement;

            const callback = () => {
                setHeight(el.scrollHeight)
            }

            callback();
            window.addEventListener("resize", callback);
            return () => {
                window.removeEventListener("resize", callback);
            }
        }
    }, [setHeight])

    const availableStars = 5;
    const numWholeStars = Math.floor(review.stars);
    const numHalfStars = (review.stars - numWholeStars) > 0.25 ? 1 : 0;
    const numEmptyStars = availableStars - numWholeStars - numHalfStars;
    const stars = [
        ...(Array(numWholeStars).fill(StarStyles.WHOLE)),
        ...(Array(numHalfStars).fill(StarStyles.HALF)),
        ...(Array(numEmptyStars).fill(StarStyles.EMPTY)),
    ] as [StarStyles];

    return (
        <article ref={reviewRef} className={className} css={stylesReview} style={stylesHideInactiveReview(currentSlide===number, height)}>
            <header css={stylesReviewMeta}>
                <div css={css(stylesQuotationMark)}>
                    <FaIcons className={"quote"} iconStyle={IconStyles.SOLID} icon="quote-left" />
                </div>

                <H3 css={stylesH5}>({review.reviewerName}, <a href={review.source.url} rel={"noopener noreferrer"} target={"_blank"}>{review.source.name}</a>)</H3>
                <div title={`${review.stars} stars out of ${availableStars} `}>
                    {
                        stars.map((style, idx) =>
                            <StarIcon css={{width: "1em", margin: "0 0.5em"}} style={style} order={idx} enabled={currentSlide===number} />
                        )
                    }
                </div>
            </header>
            <div css={stylesReviewBody}>
                {review.body}
            </div>
        </article>
    )
}

const stylesSlider = css(
    cols(12),
    cols(10, mediaBreakpoints.md),
    {
        order: 1,
    }
);

const buttonSize = "3em";
const stylesButtons: CSSInterpolation = {
    display: "flex",
    order: 1,
    marginBottom: gridSpacing/2 + "em",

    "&.prev": {
        justifyContent: "flex-start",
    },
    "&.next": {
        justifyContent: "flex-end",
    },

    button: {
        background: "transparent",
        outline: "none",
        border: "none",
        width: buttonSize,

        svg: {
            fill: "#fff",
            boxSizing: "content-box",
            width: buttonSize,
            height: buttonSize,
            transition: `transform .5s ${bounceTransition} 0s`,
        },

        "&:focus, &:hover": {
            svg: {
                borderRadius: "50%",
                transform: "scale(1.25)",
                fill: colours.brandPrimary,
                border: `0.05em solid #fff`,
                background: "#fff",
            },
        },

        "&:focus": {
            svg: {
                fill: colours.infoBlue,
                border: `0.05em solid ${colours.infoYellow}`,
                background: colours.infoYellow,
            },
        },
    },
};

stylesButtons[breakpointStrings.md] = {
    "&.next": {
        order: 2,
    }
}

const stylesWithButtonWidths = css(
    cols(6),
    cols(1, mediaBreakpoints.md),
    stylesButtons,
)

interface ReviewSliderProps {
    className?: string,
    reviews: [Review],
    inViewPort: boolean
}
export const ReviewSlider: React.FC<ReviewSliderProps> = ({className, reviews, inViewPort}) => {
    return (
        // viewport
        <Container className={className}>
            <CarouselProvider
                totalSlides={reviews.length}
                isIntrinsicHeight={true}
                interval={10000}
                isPlaying={inViewPort}
                infinite={true}
            >
                <div css={[gridContainer(), {padding: 2*gridSpacing + "em 0"}]}>
                    <div className={"prev"} css={css(stylesWithButtonWidths)}>
                        <ButtonBack><span css={stylesScreenReaderText}>Back</span>
                            <FaIcons iconStyle={IconStyles.SOLID} icon={"chevron-circle-left"}/>
                        </ButtonBack>
                    </div>
                    <div className={"next"} css={css(stylesWithButtonWidths)}>
                        <ButtonNext><span css={stylesScreenReaderText}>Next</span>
                            <FaIcons iconStyle={IconStyles.SOLID} icon={"chevron-circle-right"}/>
                        </ButtonNext>
                    </div>

                    <div css={stylesSlider}>
                        <Slider>
                            {
                                reviews.map(
                                    (review, idx) =>
                                        <Slide key={idx} index={idx} classNameVisible={"visible"}>
                                            <SliderReview review={review} number={idx} />
                                        </Slide>
                                )
                            }
                        </Slider>
                    </div>
                </div>
            </CarouselProvider>

        </Container>
    )
}

const stylesReviewsSection = css({
    background: colours.brandPrimary,
    color: "#fff",
});

interface ReviewsSectionProps {
    className?: string,
    reviews: [Review],
    inViewport: boolean
}
export const ReviewsSection: React.FC<ReviewsSectionProps> = ({className, reviews, inViewport}) => {
    return (
        <section className={className} css={stylesReviewsSection}>
            <ReviewSlider reviews={reviews} inViewPort={inViewport} />
        </section>
    );
}