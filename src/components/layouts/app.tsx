import {css, Global} from "@emotion/react";
import {colours, fontBaseSize, fontFamily, fontWeightBase, gridSpacing} from "../../styles/theme";
import {useEffect} from "react";
import {CSSInterpolation} from "@emotion/serialize";

const stylesGlobal: CSSInterpolation = {
    "html, css": {
        height: "100%",
        fontFamily: fontFamily,
        fontSize: fontBaseSize,
        fontWeight: fontWeightBase,
        background: colours.bodyBackground,
    },

    "*": {
        fontFamily: fontFamily,
        boxSizing: "border-box",
    },

    a: {
        color: colours.brandPrimary,
    },

    "ul, ol": {
        margin: 0,
        padding: 0,
        "ul, ol": {
            margin: `${gridSpacing/2}em 0 ${gridSpacing/2}em 1em`,
        },
    },

    ul: {
        listStyleType: "disc",
    },
    li: {
        margin: `${gridSpacing/3}em 0`,
    },

    p: {
        marginBottom: "1.5em",
    },

};

export const App = ({children, className}) => {
    useEffect(() => {
        if(typeof window.netlifyIdentity !== 'undefined') {
            window.netlifyIdentity.on('init', user => {
                if (!user) {
                    window.netlifyIdentity.on('login', () => {
                        document.location.href = '/admin/';
                    });
                }
            });
        }
    });

    return <div className={className}>
        <Global styles={stylesGlobal} />
        {children}
    </div>
}