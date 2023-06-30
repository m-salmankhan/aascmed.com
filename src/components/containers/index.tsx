import React from "react";
import {css} from "@emotion/react"
import {containerWidths} from "../../styles/theme";
import {breakpointStrings} from "../../styles/breakpoints";

const stylesContainer = css`
  width: ${containerWidths.xs}vw;
  margin: 0 auto;

  ${breakpointStrings.sm} {
    width: ${containerWidths.sm}vw;
  }
  ${breakpointStrings.md} {
    width: ${containerWidths.md}vw;
  }
  ${breakpointStrings.lg} {
    width: ${containerWidths.lg}vw;
  }
  ${breakpointStrings.xl} {
    width: ${containerWidths.xl}vw;
  }
`

interface ContainerProps {
    children: any,
    className?: string,
    id?: string
}

// Centered div of container width
export const Container: React.FC<ContainerProps> = ({children, className= undefined, id}) =>
    <div css={stylesContainer} className={className} id={id}>
        {children}
    </div>

const paddingAmounts = {
    xs: (100-containerWidths.xs)/2,
    sm: (100-containerWidths.sm)/2,
    md: (100-containerWidths.md)/2,
    lg: (100-containerWidths.lg)/2,
    xl: (100-containerWidths.xl)/2,
};

const stylesContainerPadded = css`
  width: 100%;
  padding-left: ${paddingAmounts.xs}vw;
  padding-right: ${paddingAmounts.xs}vw;

  ${breakpointStrings.sm} {
    padding-left: ${paddingAmounts.sm}vw;
    padding-right: ${paddingAmounts.sm}vw;
  }
  ${breakpointStrings.md} {
    padding-left: ${paddingAmounts.md}vw;
    padding-right: ${paddingAmounts.md}vw;
  }
  ${breakpointStrings.lg} {
    padding-left: ${paddingAmounts.lg}vw;
    padding-right: ${paddingAmounts.lg}vw;
  }
  ${breakpointStrings.xl} {
    padding-left: ${paddingAmounts.xl}vw;
    padding-right: ${paddingAmounts.xl}vw;
  }
`;

// Centered div with padding to make it appear to be of width containerWidth
export const PaddedContainer: React.FC<ContainerProps> = ({children, ...props}) =>
    <div css={css(stylesContainerPadded)} {...props}>
        {children}
    </div>