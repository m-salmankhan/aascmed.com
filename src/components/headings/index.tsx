import { css } from "@emotion/react";
import { colours, fontWeightHeadings } from "../../styles/theme";
import React, { ReactNode } from "react";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { cols } from "../../styles/grid";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";

const stylesHeadings = css({
    fontWeight: fontWeightHeadings,
    lineHeight: "1.2",
    margin: "1em 0 0.5em",
    color: colours.brandPrimary,
});

export const stylesBigH1 = css(stylesHeadings, {
    fontSize: "2.5rem",
});

export const stylesH1 = css(stylesHeadings, {
    fontSize: "2rem",
});

export const stylesH2 = css(stylesHeadings, {
    fontSize: "1.5rem",
});

export const stylesH3 = css(stylesHeadings, {
    fontSize: "1.25rem",
});

export const stylesH4 = css(stylesHeadings, {
    fontSize: "1.1rem",
});

export const stylesH5 = css(stylesHeadings, {
    fontSize: "1rem",
});

export const stylesH6 = css(stylesHeadings, {
    fontSize: "1rem",
    fontWeight: "bold",
});

interface HeadingProps {
    className?: string,
    children: any
}

export const H1: React.FC<HeadingProps> = ({ children, ...props }) => {
    return <h1 css={stylesH1} {...props}>{children}</h1>
}
export const H2: React.FC<HeadingProps> = ({ children, ...props }) => {
    return <h2 css={stylesH2} {...props}>{children}</h2>
}
export const H3: React.FC<HeadingProps> = ({ children, ...props }) => {
    return <h3 css={stylesH3} {...props}>{children}</h3>
}
export const H4: React.FC<HeadingProps> = ({ children, ...props }) => {
    return <h4 css={stylesH4} {...props}>{children}</h4>
}
export const H5: React.FC<HeadingProps> = ({ children, ...props }) => {
    return <h5 css={stylesH5} {...props}>{children}</h5>
}
export const H6: React.FC<HeadingProps> = ({ children, ...props }) => {
    return <h6 css={stylesH6} {...props}>{children}</h6>
}

const stylesSectionHeading = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
    {
        "h1, h2, h3, h4, h5, h6": css(
            cols(12),
            cols(9, mediaBreakpoints.lg),
            {
                "@media screen": {
                    padding: 0
                }
            }
        )
    }

);

interface SectionHeadingProps {
    className?: string
    heading: ReactNode
    bodyText?: string
}

export const SectionHeader = (props: SectionHeadingProps) =>
    <div className={props.className} css={stylesSectionHeading}>
        {props.heading}
        {
            props.bodyText &&
            <ReactMarkdown>
                {props.bodyText}
            </ReactMarkdown>
        }
    </div>