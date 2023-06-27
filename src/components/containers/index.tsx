import React, {ComponentProps} from "react";
import {css} from "@emotion/react"
import {containerWidths} from "../../styles/theme";
import {breakpointStrings} from "../../styles/breakpoints";

const stylesContainer = {
    width: `${containerWidths.xs}vw`,
    margin: "0 auto",
}

stylesContainer[breakpointStrings.sm] = {
    width: `${containerWidths.sm}vw`,
}

stylesContainer[breakpointStrings.md] = {
    width: `${containerWidths.md}vw`,
}

stylesContainer[breakpointStrings.lg] = {
    width: `${containerWidths.lg}vw`,
}

stylesContainer[breakpointStrings.xl] = {
    width: `${containerWidths.xl}vw`,
}

interface ContainerProps {
    children: any,
    className: string | undefined
}

// Centered div of container width
export const Container: React.FC<ContainerProps> = ({children, className=undefined}) =>
    <div css={stylesContainer} className={className}>
        {children}
    </div>

const paddingAmounts = {
    xs: (100-containerWidths.xs)/2,
    sm: (100-containerWidths.sm)/2,
    md: (100-containerWidths.md)/2,
    lg: (100-containerWidths.lg)/2,
    xl: (100-containerWidths.xl)/2,
};

const stylesContainerPadded = {
    width: "100%",
    paddingLeft: `${paddingAmounts.xs}vw`,
    paddingRight: `${paddingAmounts.xs}vw`,
};

stylesContainerPadded[breakpointStrings.sm] = {
    paddingLeft: `${paddingAmounts.sm}vw`,
    paddingRight: `${paddingAmounts.sm}vw`,
};

stylesContainerPadded[breakpointStrings.md] = {
    paddingLeft: `${paddingAmounts.md}vw`,
    paddingRight: `${paddingAmounts.md}vw`,
};

stylesContainerPadded[breakpointStrings.lg] = {
    paddingLeft: `${paddingAmounts.lg}vw`,
    paddingRight: `${paddingAmounts.lg}vw`,
};

stylesContainerPadded[breakpointStrings.xl] = {
    paddingLeft: `${paddingAmounts.xl}vw`,
    paddingRight: `${paddingAmounts.xl}vw`,
};

// Centered div with padding to make it appear to be of width containerWidth
export const PaddedContainer: React.FC<ContainerProps> = ({children, ...props}) =>
    <div css={css(stylesContainerPadded)} {...props}>
        {children}
    </div>