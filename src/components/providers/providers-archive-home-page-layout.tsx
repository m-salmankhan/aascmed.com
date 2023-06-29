import React from "react";
import {ProviderSummary} from "./index";
import {css} from "@emotion/react";
import {cols, gridContainer} from "../../styles/grid";
import {mediaBreakpoints} from "../../styles/breakpoints";
import {H2, stylesH1, stylesH2} from "../headings";
import ReactMarkdown from "react-markdown";
import {IconStyles} from "../font-awesome";
import {Link} from "gatsby";
import {colours, gridSpacing} from "../../styles/theme";
import {Thumbnail} from "../thumbnails";

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
            color: ${colours.brandPrimary};
            text-decoration: none;
        }
    `
);

const Providers: React.FC<ProvidersProps> = ({className, providers}) => {
    return (
        <ul className={className} css={stylesProviders}>
            {
                providers.map((provider, idx) =>
                    <li key={idx} css={stylesProviderItem}>
                        <Link to={provider.slug}>
                            <Thumbnail
                                overlayIcon={"user-md"}
                                overlayIconStyle={IconStyles.SOLID}
                                image={provider.image}
                                imageAlt={`An image of ${provider.name.title} ${provider.name.fullName}`}
                                shape={"elipse"}
                            />
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
                <div css={stylesTextWrapper}>
                    <H2 css={css(stylesH1, stylesHeading)}>{heading}</H2>
                    <ReactMarkdown>
                        {text}
                    </ReactMarkdown>
                </div>
                <Providers providers={providers} />
            </section>
        );
    }