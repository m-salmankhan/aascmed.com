import { CSSInterpolation } from "@emotion/serialize";
import { bounceTransition, colours, gridSpacing } from "../../styles/theme";
import React from "react";

export const stylesButton: CSSInterpolation = {
    display: "inline-block",
    boxSizing: "border-box",
    maxWidth: "100%",
    overflowWrap: "anywhere",
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

// Keep space between actions even when they wrap onto separate lines.
export const stylesButtonGroup: CSSInterpolation = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: `${gridSpacing / 2}em`,
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

export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) =>
    <button {...props} css={[stylesButton, stylesBtnPrimary]}>
        {children}
    </button>

export const SecondaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ children, ...props }) =>
    <button {...props} css={[stylesButton, stylesBtnSecondary]}>
        {children}
    </button>


export const PrimaryAnchor: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ children, ...props }) =>
    <a {...props} css={[stylesButton, stylesBtnPrimary]}>
        {children}
    </a>

export const SecondaryAnchor: React.FC<React.AnchorHTMLAttributes<HTMLAnchorElement>> = ({ children, ...props }) =>
    <a {...props} css={[stylesButton, stylesBtnSecondary]}>
        {children}
    </a>

