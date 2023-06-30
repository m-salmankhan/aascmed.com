import React from "react";
import {ProviderSummary} from "./index";
import {css} from "@emotion/react";
import {cols, gridContainer} from "../../styles/grid";
import {H2} from "../headings";
import {Link} from "gatsby";
import {Thumbnail} from "../thumbnails";
import {IconStyles} from "../font-awesome";
import {breakpointStrings, mediaBreakpoints} from "../../styles/breakpoints";
import Color from "color";
import {colours, gridSpacing} from "../../styles/theme";
import {SecondaryButton, stylesBtnSecondary, stylesButton} from "../buttons";

interface ProviderArchiveProps {
    className?: string
    providers: ProviderSummary[]
}
interface ProviderProps {
    className?: string
    provider: ProviderSummary
}

const stylesProviderArchive = css(
    css`
        list-style: none;
        margin: 0;
        padding: 0;
    `
);

const stylesProvider = css`
    margin: ${gridSpacing*1.5}em 0;
`;

const stylesProviderArticle = css(
    gridContainer(),
    css`
        align-items: center;
    `
);

const stylesProviderHeader = css(
    cols(12),
    cols(3, mediaBreakpoints.md),
    css`
      width: 100%;
      text-align: center; 
      margin-bottom: ${gridSpacing/2}em;
      
      a {
        text-decoration: none;
        outline: none;
        
        .degree {
          color: ${Color(colours.brandPrimary).desaturate(1).toString()}
        }
        
        &:hover, &:focus, &:active {
          text-decoration: underline;
        }
      }
    `
);

const styleThumbnail = css`
  width: 70%;
  margin: 0 auto;
`;

const stylesProviderExcerpt = css(
    cols(12),
    cols(9, mediaBreakpoints.md),
    css`
        .read-more {
          margin: ${gridSpacing}em 0;
          text-align: center;
          
          ${breakpointStrings.md} {
            text-align: left;
          }
        }
    `
);

const Provider: React.FC<ProviderProps> = ({className, provider}) => {
    const nameWithTitle = (!!provider.name.title ? `${provider.name.title}. ` : "" ) + provider.name.fullName;
    return (
        <li className={className} css={stylesProvider}>
            <article css={stylesProviderArticle}>
                <header css={stylesProviderHeader}>
                    <Link to={provider.slug}>
                        {
                            provider.image &&
                            <Thumbnail
                                css={styleThumbnail}
                                overlayIcon={`user-md`}
                                overlayIconStyle={IconStyles.SOLID}
                                image={provider.image}
                                imageAlt={`An image of ${nameWithTitle}`}
                                shape={"elipse"}
                            />
                        }
                        <H2>{nameWithTitle}</H2>
                        {!!provider.name.degree && <span className={"degree"}>{provider.name.degree}</span>}
                    </Link>
                </header>
                <div css={stylesProviderExcerpt}>
                    {provider.excerpt}
                    <div className={"read-more"}>
                        <Link to={provider.slug} css={[stylesButton, stylesBtnSecondary]}>Read More</Link>
                    </div>
                </div>
            </article>
        </li>
    )
}

export const ProviderArchive: React.FC<ProviderArchiveProps> = ({className, providers}) =>
    <ul className={className} css={stylesProviderArchive}>
        {providers.map((provider, idx) => <Provider provider={provider} key={idx} />)}
    </ul>