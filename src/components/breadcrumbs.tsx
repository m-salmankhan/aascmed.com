import React from "react";
import {SiteLink} from "../navigation/link";
import {css} from "@emotion/react";
import {colours, gridSpacing} from "../styles/theme";

const stylesBreadcrumbs = css({
    color: colours.primaryMuted,


    ".breadcrumb-text": {
        paddingRight: "1rem",
    },

    ol: {
        display: "inline-block",
        listStyle: "none",
        margin: `${gridSpacing}em 0 0 0`,
        padding: 0,

        li: {
            display: "inline",

            a: {
                color: colours.primaryMuted,
                "&:focus": {
                    outline: "none",
                    backgroundColor: colours.primaryMuted,
                    color: "#fff",
                },
            },

            "&:after": {
                content: `'>'`,
                margin: "0 0.25em",
            },

            "&:last-of-type": {
                a: {
                    textDecoration: "none",
                },
                "&:after": {
                    content: "none",
                },
            },

        },
    }
});

interface BreadcrumbsProps {
    path: Array<[string, string]>,
    className?: string,
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({path, className=''}) =>
    <div className={className} css={stylesBreadcrumbs}>
        <span className={"breadcrumb-text"}>You are here:</span>
        <ol>
            {path.map(
                (item, key) =>
                    <li key={key}><SiteLink href={item[0]}>{item[1]}</SiteLink></li>
            )}
        </ol>
    </div>
