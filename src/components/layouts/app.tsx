import {css} from "@emotion/react";
import {fontBaseSize, fontFamily, fontWeightBase} from "../../styles/theme";

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

export const App = ({children}) =>
    <div css={stylesApplication}>
        {children}
    </div>