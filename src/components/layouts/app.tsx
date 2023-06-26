import {css} from "@emotion/react";
import {fontBaseSize, fontFamily, fontWeightBase} from "../../styles/theme";
import {useEffect} from "react";

const stylesApplication = css({
    padding: 0,
    margin: 0,
    fontSize: fontBaseSize,
    fontWeight: fontWeightBase,
    "*": {
        boxSizing: "border-box",
        fontFamily: fontFamily,
    },
});

export const App = ({children}) => {
    useEffect(() => {
        if(typeof window.netlifyIdentity !== "undefined") {
            window.netlifyIdentity.on('init', user => {
                if (!user) {
                    window.netlifyIdentity.on('login', () => {
                        document.location.href = '/admin/';
                    });
                }
            });
        }
    });

    return <div css={stylesApplication}>
        {children}
    </div>
}