import {Container} from "../containers";
import {H1, H2, H3, stylesH1, stylesH4} from "../headings";
import {css} from "@emotion/react";
import ReactMarkdown from "react-markdown";
import React from "react";
import {ConditionList} from "../conditions/conditions-archive";
import {cols, gridContainer} from "../../styles/grid";
import {mediaBreakpoints} from "../../styles/breakpoints";
import {Link} from "gatsby";
import {CSSInterpolation} from "@emotion/serialize";
import {colours, gridSpacing} from "../../styles/theme";
import Color from "color";

export interface ServiceUpdateSummary {
    slug: string,
    date: string,
    title: string,
    description: string,
}

interface ServiceUpdateListProps {
    className?: string
    serviceUpdates: [ServiceUpdateSummary]
    frontPage: boolean
}

const stylesList = css(
    gridContainer(),
    {
        listStyle: "none",
        padding: 0,
        margin: 0,
    }
);
const stylesLi = css(
    cols(12),
    cols(6, mediaBreakpoints.md),
    cols(4, mediaBreakpoints.lg),
    {
        margin: "1em 0 1em",

        header: {
            a: {
                display: "block",
                textDecoration: "none",
                marginBottom: `${gridSpacing/4}`,

                "h1, h2, h3": {
                    margin: `0.5em 0 1em`,
                },

                ".date": {
                    color: Color(colours.brandPrimary).desaturate(1).toString(),
                },

                "&:hover": {
                    textDecoration: "underline",
                },
            }
        },

        footer: {
            marginTop: "1em",
            a: {
                color: Color(colours.brandPrimary).desaturate(1).toString(),
            }
        }
    }
);

export const ServiceUpdateList: React.FC<ServiceUpdateListProps> = ({className, serviceUpdates, frontPage}) => {
    return (
        <ul className={className} css={stylesList}>
            {
                serviceUpdates.map((post, idx) =>
                    <li key={idx} css={stylesLi}>
                        <article>
                            <header>
                                <Link to={post.slug}>
                                    <div className={"date"}>{post.date}</div>
                                    {
                                        frontPage ? <H3 css={stylesH4} className={"title"}>{post.title}</H3> :
                                                    <H2 css={stylesH4} className={"title"}>{post.title}</H2>
                                    }
                                </Link>
                            </header>
                            {post.description}
                            <footer>
                                <Link to={post.slug}>Read more&hellip;</Link>
                            </footer>
                        </article>
                    </li>
                )
            }
        </ul>
    )
}

interface ServiceUpdateArchiveProps {
    className?: string,
    serviceUpdates: ServiceUpdateSummary[],
    frontPage: boolean,
    heading: string,
    text: string,
}

const stylesTextWrapper = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
);

const stylesHeading = css(
    cols(12),
    cols(9, mediaBreakpoints.lg),
    {
        padding: 0,
        "@media screen": {
            padding: 0,
        }
    }
);

export const ServiceUpdateArchive: React.FC<ServiceUpdateArchiveProps> =
    ({className, heading, text, serviceUpdates, frontPage}) => {
        if(serviceUpdates.length == 0) {
            return <></>;
        }
        return (
            <section className={className}>
                <div css={stylesTextWrapper}>
                    {
                        frontPage ?
                            <H2 css={css(stylesH1, stylesHeading)}>{heading}</H2> :
                            <H1 css={stylesHeading}>{heading}</H1>
                    }
                    <ReactMarkdown>
                        {text}
                    </ReactMarkdown>
                </div>
                <ServiceUpdateList serviceUpdates={serviceUpdates} frontPage={frontPage}/>
                {
                    frontPage &&
                    <Link to={"/service-updates/"} css={css(cols(12), {color: "inherit"})}>(View All)</Link>
                }
            </section>
        );
}