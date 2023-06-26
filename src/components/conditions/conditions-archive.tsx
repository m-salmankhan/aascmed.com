import {Container} from "../containers";
import {H1, H2, stylesH1, stylesH5} from "../headings";
import React from "react";
import ReactMarkdown from "react-markdown";
import {css} from "@emotion/react";
import {cols, gridContainer} from "../../styles/grid";
import {mediaBreakpoints} from "../../styles/breakpoints";
import {CSSInterpolation} from "@emotion/serialize";
import {FaIcons, IconStyles} from "../font-awesome";
import {GatsbyImage, IGatsbyImageData} from "gatsby-plugin-image";
import {Link} from "gatsby";
import {bounceTransition, colours, gridSpacing} from "../../styles/theme";
import Color from "color";

export interface ConditionSummary {
    thumbnail: IGatsbyImageData,
    title: string,
    slug: string
}

interface ConditionsIndexProps {
    heading: string,
    text: string,
    className?: string,
    frontPage: boolean,
    conditionsList: ConditionSummary[],
}

interface ConditionListProps {
    className?: string,
    conditions: ConditionSummary[],
}

const stylesConditionsGrid = css(
    gridContainer(),
    {
        listStyle: "none",
        margin: 0,
        padding: 0,
    }
);

const stylesLink : CSSInterpolation = {
    textDecoration: "none",

    ".heading": {
        textAlign: "center",
    },

    ".thumbnail": {
        height: "15rem",
        width: "100%",
        background: colours.brandPrimary,
        position: "relative",
        overflow: "hidden",
        transition: "transform .25s ease 0s",

        "&.view-all .overlay": {
            opacity: 1,
        },

        ".gatsby-image-wrapper": {
            height: "100%",
        },

        ".overlay": {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            background: `linear-gradient(to top right, ${Color(colours.brandPrimary).darken(0.3).fade(0.1)}, ${Color(colours.brandSecondary).darken(0.3).fade(0.1)})`,
            opacity: 0,
            transition: "opacity .25s ease-in-out 0s",

            "@media (prefers-reduced-motion)": {
                transition: "opacity 0.05s ease-in-out 0s",
            },

            ".icon": {
                fill: "#fff",
                width: "3rem",
                height: "3rem",
                transition: `transform 1s ${bounceTransition} 0s`,

                "@media (prefers-reduced-motion)": {
                    transition: `transform 0.05s ${bounceTransition} 0s`,
                }
            }
        },
    },

    "&:hover, &:focus, &:active": {
        outline: "none",
        border: "none",

        ".thumbnail": {
            ".overlay": {
                opacity: 1,

                ".icon": {
                    transform: "scale(1.5)",
                },
            },
        },

        ".heading": {
                textDecoration: "underline",
        }
    },

    "&:focus, &:active": {
        ".thumbnail .overlay": {
            background: `linear-gradient(to top right, ${Color(colours.brandPrimary).darken(0.8).fade(0.1)}, ${Color(colours.brandSecondary).darken(0.3).fade(0.1)})`,

            ".icon": {
                    fill: colours.infoYellow,
            }
        }
    },
}

const stylesLi = css(
    cols(12),
    cols(6, mediaBreakpoints.md),
    cols(4, mediaBreakpoints.lg),
    {
        marginBottom: gridSpacing/2 + "em",
    }
);

export const ConditionList: React.FC<ConditionListProps> = ({className, conditions}) =>
    <ul className={className} css={stylesConditionsGrid}>
        {
            conditions.map(
                (condition, idx) =>
                    <li key={idx} css={stylesLi}>
                        <Link to={condition.slug} css={css(stylesLink)}>
                            <div className={"thumbnail"}>
                                <GatsbyImage alt={""} image={condition.thumbnail}/>
                                <div className={"overlay"}>
                                    <FaIcons iconStyle={IconStyles.SOLID} icon="search" className={"icon"} />
                                </div>
                            </div>
                            <H2 css={stylesH5} className={"heading"}>{ condition.title }</H2>
                        </Link>
                    </li>
            )
        }
        <li css={css(stylesLi)}>
            <Link to={"/conditions/"} css={css(stylesLink)}>
                <div className="thumbnail view-all">
                    <div className="overlay">
                        <FaIcons iconStyle={IconStyles.SOLID} icon="plus" className={"icon"} />
                    </div>
                </div>
                <H2 css={stylesH5} className={"heading"}>View All</H2>
            </Link>
        </li>
    </ul>



const stylesConditionsTextWrapper = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
);

const stylesConditionsHeading = css(
    cols(12),
    cols(9, mediaBreakpoints.lg),
    {
        padding: 0,
        fontSize: "2.5rem",
        "@media screen": {
            padding: 0,
        }
    }
);

export const ConditionsArchive: React.FC<ConditionsIndexProps> = ({className, text, heading, frontPage, conditionsList = false}) => {
    return (
        <section className={className}>
            <Container>
                <div css={stylesConditionsTextWrapper}>
                    {
                        frontPage ?
                            <H2 css={stylesConditionsHeading}>{heading}</H2> :
                            <H1 css={stylesConditionsHeading}>{heading}</H1>
                    }
                    <ReactMarkdown>
                        {text}
                    </ReactMarkdown>
                </div>
                <ConditionList conditions={conditionsList} />
            </Container>
        </section>
    );
}