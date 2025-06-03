import React from "react";
import PropTypes from "prop-types"
import {Link} from "gatsby";
import {css} from "@emotion/react";
import Color from "color";
import {colours, gridSpacing} from "../styles/theme";

const stylesBreadcrumbs = css({
    color: Color(colours.brandPrimary).desaturate(1).toString(),


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
                color: Color(colours.brandPrimary).desaturate(1).toString(),
                "&:focus": {
                    outline: "none",
                    backgroundColor: Color(colours.brandPrimary).desaturate(1).toString(),
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

export const Breadcrumbs = ({path, className=''}) =>
    <div className={className} css={stylesBreadcrumbs}>
        <span className={"breadcrumb-text"}>You are here:</span>
        <ol>
            {path.map(
                (item, key) =>
                    <li key={key}><Link to={item[0]}>{item[1]}</Link></li>
            )}
        </ol>
    </div>

Breadcrumbs.propTypes = {
    path: PropTypes.array.isRequired,
}