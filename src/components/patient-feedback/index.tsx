import React, {useEffect, useMemo, useRef, useState} from "react";
import {FaIcons, IconStyles} from "../font-awesome";
import {css} from "@emotion/react";
import {alternativeBounceTransition, bounceTransition, colours, gridSpacing} from "../../styles/theme";
import {stylesScreenReaderText} from "../../styles/accessibility";
import Color from "color";
import {H3, stylesH1, stylesH2} from "../headings";
import {Link} from "gatsby";

export interface Review {
    body: string,
    stars: number,
    source: {
        url: string,
        name: string,
    }
}

interface StarRatingProps {
    rating: number,
    source: {
        url: string,
        name: string,
    },
    date: string,
    enabled: boolean,
}

interface StarCount {
    whole: number,
    half: boolean,
    empty: number,
}
const calculateNumStars = (rating: number): StarCount =>  {
    const totalAvailableStars = 5;
    const stars = totalAvailableStars * Math.round(rating * 10)/10;
    const whole = Math.floor(stars);
    const half = (stars - whole) == 0.5;
    const empty = totalAvailableStars - whole - (half ? 1 : 0);
    return { whole, half, empty }
}

enum StarStyles {
    WHOLE,
    HALF,
    EMPTY
}

interface StarProps {
    style: StarStyles
    order: number
    enabled: boolean
}

const stylesStar = (visible: boolean) => css({
    fill: "#fff",
    width: "3em",
    height: "3em",
    margin: `0 ${gridSpacing/2}em`,
    transition: `transform ${visible ? ".5s" : "0s"} ${alternativeBounceTransition} 0s`,
    transform: `scale(${visible ? 1 : 0})`,
});
const Star: React.FC<StarProps> = ({style, order, enabled}) => {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if(enabled) {
            const timeout = setTimeout(() => setVisible(true), order * 250);
            return () => {
                clearTimeout(timeout);
            }
        } else {
            setVisible(false);
        }
    }, [visible, setVisible, enabled]);

    switch (style) {
        case StarStyles.WHOLE:
            return <FaIcons iconStyle={IconStyles.SOLID} icon="star" css={stylesStar(visible)}/>
        case StarStyles.HALF:
            return <FaIcons iconStyle={IconStyles.SOLID} icon="star-half-alt" css={stylesStar(visible)}/>
        case StarStyles.EMPTY:
            return <FaIcons iconStyle={IconStyles.REGULAR} icon="star" css={stylesStar(visible)}/>
    }
}

const stylesStarRating = css({
    background: Color(colours.brandPrimary).darken(0.5).saturate(0.8).toString(),
    textAlign: "center",
    color: "#fff",
    padding: `${gridSpacing*3}em 0`,

    ".stars": {
        paddingBottom: `${gridSpacing/2}em`,
    },

    "h3, a": {
        color: "#fff",
    },
});
const StarRating: React.FC<StarRatingProps> = ({rating, source, date, enabled}) => {
    const {whole, half, empty} = useMemo(() => calculateNumStars(rating), [rating]);

    const fullStars: StarStyles[] = Array(whole).fill(StarStyles.WHOLE) as StarStyles[];
    const halfStars: StarStyles[] = half ? [StarStyles.HALF] : [] as StarStyles[];
    const emptyStars: StarStyles[] = Array(empty).fill(StarStyles.EMPTY) as StarStyles[];
    const stars = [...fullStars, ...halfStars, ...emptyStars];

    return (
        <div css={stylesStarRating}>
            <div className={"stars"} title={`${Math.round(rating*100/2)/10} stars out of 5`}>
                {
                    stars.map(
                        (style, idx) =>
                            <Star key={idx} style={style} order={idx} enabled={enabled}/>
                    )
                }
            </div>
            <H3 css={stylesH1}>Average Rating {Math.round(rating * 100)}%</H3>
            (<Link to={source.url}>{source.name}</Link>, {date})
        </div>
    )

}

interface PatientFeedbackProps {
    className?: string
}
export const PatientFeedback: React.FC<PatientFeedbackProps> = ({className}) => {
    const sectionRef = useRef<HTMLElement | null>(null);
    const [intersectionObserver, setIntersectionObserver] = useState<IntersectionObserver | null>(null);
    const [enable, setEnable] = useState(false);

    const observerCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver): void => {
        entries.forEach((entry) => {
             setEnable(entry.isIntersecting);
        });
    }

    useEffect(() => {
        if(sectionRef.current === null)
            return;

        const observer = new IntersectionObserver(observerCallback, {
            root: null,
            rootMargin: '0px',
            threshold: 0.5,
        } as IntersectionObserverInit);

        observer.observe(sectionRef.current as HTMLElement);
        setIntersectionObserver(observer);
    }, [sectionRef, intersectionObserver, setIntersectionObserver]);

    const source = {
        url: "https://www.healthgrades.com/group-directory/il-illinois/aurora/allergy-asthma-and-sinus-centers-aurora-oyyn35r",
        name: "Healthgrades"
    }
    return (
        <section ref={sectionRef} className={className}>
            <h2 css={stylesScreenReaderText}>Patient Feedback</h2>
            <StarRating rating={0.98} source={source} date={"July 2020"} enabled={enable}/>
        </section>
    );
}