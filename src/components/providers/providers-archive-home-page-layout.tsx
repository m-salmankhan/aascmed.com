import React from "react";
import { ProviderSummary } from "./index";
import { css } from "@emotion/react";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { H2, SectionHeader, stylesBigH1, stylesH1, stylesH2 } from "../headings";
import ReactMarkdown from "react-markdown";
import { IconStyles } from "../font-awesome";
import { Link } from "gatsby";
import { colours, gridSpacing } from "../../styles/theme";
import { Thumbnail } from "../thumbnails";
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
    css`
        margin-bottom: ${gridSpacing}em;
    
        a {
          text-decoration: none;
          
          &:hover, &:focus, &:active {
            text-decoration: underline;
            outline: none;
          }
          
          .read-more {
            color: ${Color(colours.brandPrimary).desaturate(1).toString()}
          }
        }
    `
);

const Providers: React.FC<ProvidersProps> = ({ className, providers }) => {
    return (
        <ul className={className} css={stylesProviders}>
            {
                providers.map((provider, idx) =>
                    <li key={idx} css={stylesProviderItem}>
                        <Link to={provider.slug}>
                            {provider.image && <Thumbnail
                                overlayIcon={"user-doctor"}
                                overlayIconStyle={IconStyles.SOLID}
                                gatsbyImage={provider.image}
                                imageAlt={`An image of ${provider.name.title} ${provider.name.fullName}`}
                                shape={"elipse"}
                            />}
                            <h3 className={"heading"} css={stylesH2}>{`${provider.name.fullName}, ${provider.name.degreeAbbr}`}</h3>
                            <div className="read-more">Read more...</div>
                        </Link>
                    </li>
                )
            }
        </ul>
    )
}


export const ProvidersArchiveHomePageLayout: React.FC<ProvidersArchiveProps> =
    ({ className, heading, text, providers }) => {
        if (providers.length == 0)
            return <></>;

        return (
            <section className={className}>
                <SectionHeader
                    heading={
                        <h2 css={stylesBigH1}>{heading}</h2>
                    }
                    bodyText={text}
                />
                <Providers providers={providers as [ProviderSummary]} />
            </section>
        );
    }