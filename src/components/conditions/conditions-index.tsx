import {Container} from "../containers";
import {H1, H2, stylesH1} from "../headings";
import React from "react";
import ReactMarkdown from "react-markdown";
import {css} from "@emotion/react";
import {cols} from "../../styles/grid";
import {mediaBreakpoints} from "../../styles/breakpoints";

interface ConditionsIndexProps {
    heading: string,
    text: string,
    className?: string,
    frontPage: boolean,
}

const stylesConditionsTextWrapper = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
);

const stylesConditionsHeading = css(
    cols(12),
    cols(9, mediaBreakpoints.lg),
    {
        padding: 0,
        "@media screen": {
            padding: 0,
        }
    }
);

export const ConditionsIndex: React.FC<ConditionsIndexProps> = ({className, text, heading, frontPage = false}) => {
    return (
        <section className={className}>
            <Container>
                <div css={stylesConditionsTextWrapper}>
                    {
                        frontPage ?
                            <H2 css={css(stylesH1, stylesConditionsHeading)}>{heading}</H2> :
                            <H1 css={stylesConditionsHeading}>{heading}</H1>
                    }
                    <ReactMarkdown>
                        {text}
                    </ReactMarkdown>
                </div>

            </Container>
        </section>
    );
}