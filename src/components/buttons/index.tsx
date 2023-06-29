import {CSSInterpolation} from "@emotion/serialize";
import {bounceTransition, colours} from "../../styles/theme";
import React, {HTMLProps} from "react";
import {Link} from "gatsby";

export const stylesButton: CSSInterpolation = {
    display: "inline-block",
    fontSize: "1rem",
    fontWeight: "bold",
    textDecoration: "none",
    textAlign: "center",
    padding: "0.5rem",
    cursor: "pointer",
    transition: `transform 1s ${bounceTransition} 0s,
        border 0.5s ease 0s,
        background-color 0.5s ease 0s`,
    outline: "none",
    border: `0.25rem solid ${colours.brandPrimary}`,

    "&:focus": {
        transform: "scale(0.8)",
    },
}

export const stylesBtnPrimary: CSSInterpolation = {
    backgroundColor: colours.brandPrimary,
    color: colours.bodyBackground,

    "&:hover, &:focus": {
        outline: "none",
        color: colours.brandPrimary,
        backgroundColor: colours.bodyBackground,
    },
}

export const stylesBtnSecondary: CSSInterpolation = {
    backgroundColor: colours.bodyBackground,
    color: colours.brandPrimary,

    "&:hover, &:focus": {
        outline: "none",
        color: colours.bodyBackground,
        backgroundColor: colours.brandPrimary,
        borderColor: colours.bodyBackground,
    },
}

export const PrimaryButton: React.FC<HTMLProps<HTMLButtonElement>> = ({children, ...props}) =>
    <button {...props} css={[stylesButton, stylesBtnPrimary]}>
        {children}
    </button>

export const SecondaryButton: React.FC<HTMLProps<HTMLButtonElement>> = ({children, ...props}) =>
    <button {...props} css={[stylesButton, stylesBtnSecondary]}>
        {children}
    </button>


export const PrimaryAnchor: React.FC<HTMLProps<HTMLAnchorElement>> = ({children, ...props}) =>
    <a {...props} css={[stylesButton, stylesBtnPrimary]}>
        {children}
    </a>

export const SecondaryAnchor: React.FC<HTMLProps<HTMLAnchorElement>> = ({children, ...props}) =>
    <a {...props} css={[stylesButton, stylesBtnSecondary]}>
        {children}
    </a>

