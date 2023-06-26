import React from "react";
import {ProviderSummary} from "./index";
import {css} from "@emotion/react";
import {cols, gridContainer} from "../../styles/grid";
import {mediaBreakpoints} from "../../styles/breakpoints";
import {Container} from "../containers";
import {H1, H2, stylesH1, stylesH2} from "../headings";
import ReactMarkdown from "react-markdown";
import {GatsbyImage} from "gatsby-plugin-image";
import {FaIcons, IconStyles} from "../font-awesome";
import {Link} from "gatsby";
import {bounceTransition, colours, gridSpacing} from "../../styles/theme";
import {CSSInterpolation} from "@emotion/serialize";
import Color from "color";

interface ProvidersArchiveProps {
    className?: string,
    heading: string,
    text: string
    providers: ProviderSummary[]
}
interface ProvidersProps {
    className?: string,
    providers: [ProviderSummary]
}

const stylesProviders = css(
    gridContainer(),
    {
        padding: 0,
        margin: 0,
        textAlign: "center",
        marginTop: `${gridSpacing}em`,
        listStyle: "none",
    }
);
const stylesProviderItem = css(
    cols(12),
    cols(6, mediaBreakpoints.md),
    cols(3, mediaBreakpoints.lg),
    {
        marginBottom: `${gridSpacing}em`,
        a: {
            color: colours.brandPrimary,
            textDecoration: "none",

            ".thumbnail": {
                position: "relative",
                width: "70%",
                margin: "0 auto",
                borderRadius: "50em",
                overflow: "hidden",

                img: {
                    borderRadius: "50em",
                },

                ".overlay": {
                    borderRadius: "50em",
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
                textDecoration: "underline",

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

        },
    }
);

const Providers: React.FC<ProvidersProps> = ({className, providers}) => {
    return (
        <ul className={className} css={stylesProviders}>
            {
                providers.map((provider, idx) =>
                    <li key={idx} css={stylesProviderItem}>
                        <Link to={provider.slug}>
                            <div className={"thumbnail"}>
                                <GatsbyImage image={provider.image} alt={`An image of ${provider.name.title} ${provider.name.fullName}`} />
                                <div className={"overlay"}>
                                    <FaIcons iconStyle={IconStyles.SOLID} icon="user-md" className={"icon"}/>
                                </div>
                            </div>
                            <h3 className={"heading"} css={stylesH2}>{`${provider.name.fullName}, ${provider.name.degreeAbbr}`}</h3>
                            <div className="read-more">Read more...</div>
                        </Link>
                    </li>
                )
            }
        </ul>
    )
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

export const ProvidersArchiveHomePageLayout: React.FC<ProvidersArchiveProps> =
    ({className, heading, text, providers}) => {
        if(providers.length == 0) {
            return <></>;
        }
        return (
            <section className={className}>
                <Container>
                    <div css={stylesTextWrapper}>
                        <H2 css={css(stylesH1, stylesHeading)}>{heading}</H2>
                        <ReactMarkdown>
                            {text}
                        </ReactMarkdown>
                    </div>
                    <Providers providers={providers} />
                </Container>
            </section>
        );
    }