import {css} from "@emotion/react";
import {alternativeBounceTransition, colours, gridSpacing} from "../../styles/theme";
import React, {useEffect, useRef, useState} from "react";
import {FaIcons, IconStyles} from "../font-awesome";
import Color from "color";
import {H3, stylesH1} from "../headings";

interface StarCount {
    whole: number,
    half: boolean,
    empty: number,
}

function calculateNumStars(rating: number): StarCount {
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

interface StarIconProps {
    style: StarStyles
    order: number
    enabled: boolean
}

const stylesStarIcon = (visible: boolean) => css({
    fill: "#fff",
    width: "3em",
    height: "3em",
    margin: `0 ${gridSpacing/2}em`,
    transition: `transform ${visible ? ".5s" : "0s"} ${alternativeBounceTransition} 0s`,
    transform: `scale(${visible ? 1 : 0})`,
});

const StarIcon: React.FC<StarIconProps> = ({style, order, enabled}) => {
    const [visible, setVisible] = useState(false);
    const timeoutId = useRef<number | null>(null);

    useEffect(() => {
        if(enabled && !visible) {
            timeoutId.current = window.setTimeout(() => {
                setVisible(true);
            }, order * 250);

            return () => {
                if(timeoutId.current)
                    clearTimeout(timeoutId.current as number);
            }
        } else {
            setVisible(false);
            timeoutId.current = null;
        }
    }, [enabled, timeoutId, setVisible]);

    switch (style) {
        case StarStyles.WHOLE:
            return <FaIcons iconStyle={IconStyles.SOLID} icon="star" css={stylesStarIcon(visible)}/>
        case StarStyles.HALF:
            return <FaIcons iconStyle={IconStyles.SOLID} icon="star-half-alt" css={stylesStarIcon(visible)}/>
        case StarStyles.EMPTY:
            return <FaIcons iconStyle={IconStyles.REGULAR} icon="star" css={stylesStarIcon(visible)}/>
    }
}

interface AverageRatingProps {
    rating: number,
    source: {
        url: string,
        name: string,
    },
    date: string,
    enabled: boolean,
}

const stylesAverageRating = css({
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
export const AverageRating: React.FC<AverageRatingProps> = ({rating, source, date, enabled}) => {
    const {whole, half, empty} = calculateNumStars(rating);

    const stars = [
        ...(Array(whole).fill(StarStyles.WHOLE)),
        ...(half ? [StarStyles.HALF] : []),
        ...(Array(empty).fill(StarStyles.EMPTY))
    ];

    return (
        <div css={stylesAverageRating}>
            <div className={"stars"} title={`${Math.round(rating*100/2)/10} stars out of 5`}>
                {
                    stars.map(
                        (style, idx) =>
                            <StarIcon key={idx} style={style} order={idx} enabled={enabled}/>
                    )
                }
            </div>
            <H3 css={stylesH1}>Average Rating {Math.round(rating * 100)}%</H3>
            (<a href={source.url} rel={"noopener"}>{source.name}</a>, {date})
        </div>
    )
}
