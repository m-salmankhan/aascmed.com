import React, {HTMLProps, ReactNode} from "react";
import {CSSInterpolation} from "@emotion/serialize";
import {colours, gridSpacing} from "../../styles/theme";
import {stylesH1, stylesH2, stylesH3, stylesH4, stylesH5, stylesH6} from "../headings";
import {breakpointStrings} from "../../styles/breakpoints";

const stylesArticle: CSSInterpolation = {
    "ul, ol": {
        margin: 0,
        padding: 0,
        "ul, ol": {
            margin: `${gridSpacing/2}em 0 ${gridSpacing/2}em 1em`,
        },
    },

    ul: {
        listStyleType: "disc",
    },
    li: {
        margin: `${gridSpacing/3}em 0`,
    },

    p: {
        marginBottom: "1.5em",
    },

    h1: [stylesH1, {
        fontSize: "2.5em",
    }],
    h2: stylesH1,
    h3: stylesH2,
    h4: stylesH3,
    h5: stylesH4,
    h6: stylesH5,

    "h1, h2, h3, h4, h5, h6": {
        margin: "1em 0 0.5em",
    },

    ".link-icon": {
        marginRight: `${gridSpacing/2}em`,
        marginLeft: 0,

        svg: {
            fill: colours.brandPrimary,
            transform: "scale(1.25)",
            verticalAlign: "middle",
        },

        "&:focus, &:active": {
            outline: "none",
            border: "none",

            svg: {
                visibility: "visible",
                boxSizing: "content-box",
                borderBottom: `5px solid ${colours.brandPrimary}`,
                borderTop: `5px solid ${colours.brandPrimary}`,
            }
        }
    }
}

stylesArticle[breakpointStrings.md] = {
    ".link-icon": {
        marginLeft: `${-gridSpacing/2}em`,

        svg: {
            visibility: "visible",
        }
    },
}

export const Article: React.FC<HTMLProps<HTMLDivElement>> = ({children, ...props}) =>
    <article css={stylesArticle} {...props}>
        {children}
    </article>