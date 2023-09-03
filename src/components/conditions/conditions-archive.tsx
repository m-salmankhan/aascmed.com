import { H2, SectionHeader, stylesBigH1, stylesH5 } from "../headings";
import React from "react";
import { css } from "@emotion/react";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { IconStyles } from "../font-awesome";
import { IGatsbyImageData } from "gatsby-plugin-image";
import { Link } from "gatsby";
import { gridSpacing } from "../../styles/theme";
import { Thumbnail } from "../thumbnails";

export interface ConditionSummary {
    thumbnail?: IGatsbyImageData,
    title: string,
    slug: string
}

interface ConditionsArchiveProps {
    heading: string,
    text: string,
    className?: string,
    frontPage: boolean,
    conditionsList: ConditionSummary[],
    showViewAll: boolean
}

interface ConditionListProps {
    className?: string,
    conditions: ConditionSummary[],
    showViewAll: boolean
}

const stylesConditionsGrid = css(
    gridContainer(),
    {
        listStyle: "none",
        margin: 0,
        padding: 0,
    }
);

const stylesThumbnail = css`
  height: 15rem;
`;

const stylesLi = css(
    cols(12),
    cols(6, mediaBreakpoints.md),
    cols(4, mediaBreakpoints.lg),
    css`
        margin-bottom: ${gridSpacing / 2}em;
        a {
          text-align: center;
          text-decoration: none;
          
          &:hover, &:focus, &:active {
            text-decoration: underline;
            outline: none;
          }
        }
    `
);

export const ConditionList: React.FC<ConditionListProps> = ({ className, conditions, showViewAll = true }) =>
    <ul className={className} css={stylesConditionsGrid}>
        {
            conditions.map(
                (condition, idx) =>
                    <li key={idx} css={stylesLi}>
                        <Link to={condition.slug}>
                            <Thumbnail
                                css={stylesThumbnail}
                                overlayIconStyle={IconStyles.SOLID}
                                overlayIcon={"magnifying-glass"}
                                gatsbyImage={condition.thumbnail}
                            />
                            <H2 css={stylesH5} className={"heading"}>{condition.title}</H2>
                        </Link>
                    </li>
            )
        }
        {
            showViewAll &&
            <li css={css(stylesLi)}>
                <Link to={"/conditions/"}>
                    <Thumbnail
                        css={css(stylesThumbnail)}
                        overlayIcon={"plus"}
                        overlayIconStyle={IconStyles.SOLID}
                        showOverlay={true}
                    />
                    <H2 css={stylesH5} className={"heading"}>View All</H2>
                </Link>
            </li>
        }
    </ul>




export const ConditionsArchive: React.FC<ConditionsArchiveProps> = ({ className, text, heading, frontPage, conditionsList, showViewAll = true }) => {
    return (
        <section className={className}>
            <SectionHeader
                heading={
                    frontPage ?
                        <h2 css={stylesBigH1}>{heading}</h2> :
                        <h1 css={stylesBigH1}>{heading}</h1>
                }
                bodyText={text}
            />
            <ConditionList conditions={conditionsList} showViewAll={showViewAll} />
        </section>
    );
}