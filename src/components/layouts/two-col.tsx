import {App} from "./app";
import {NavBar} from "../header";
import React, {ReactNode} from "react";
import {css} from "@emotion/react";
import {cols, gridContainer, offsetCols} from "../../styles/grid";
import {breakpointStrings, mediaBreakpoints} from "../../styles/breakpoints";
import {Container} from "../containers";
import {gridSpacing} from "../../styles/theme";
import {CSSInterpolation} from "@emotion/serialize";

interface TwoColLayoutProps {
    children: ReactNode,
    className?: string
}
interface ColumnProps {
    children: ReactNode,
    className?: string
}
export const TwoColLayout: React.FC<TwoColLayoutProps> = ({children, className}) => {
    return (
        <App className={className} >
            <NavBar />
            <Container id={"main"}>
                {children}
            </Container>
        </App>
    );
}

export const Columns: React.FC<TwoColLayoutProps> = ({children, className}) =>
    <div css={[gridContainer(), {margin: `0 -${gridSpacing/2}em`}]} className={className}>
        {children}
    </div>


const stylesMainCol = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
    {}
);
const stylesReorderMain: CSSInterpolation = {
    order: 1,
};
stylesReorderMain[breakpointStrings.md] = {
    order: 0,
}
export const MainCol: React.FC<ColumnProps> = ({children, className}) => {
    return (
        <div className={className} css={[stylesMainCol, stylesReorderMain]}>
            {children}
        </div>
    );
}
const stylesSideCol = css(
    cols(12),
    offsetCols(1, mediaBreakpoints.md),
    cols(3, mediaBreakpoints.md),
    {}
);
const stylesReorderSide: CSSInterpolation = {
    order: 0,
};
stylesReorderSide[breakpointStrings.md] = {
    order: 1,
}
export const SideCol: React.FC<ColumnProps> = ({children, className}) => {
    return (
        <div className={className} css={[stylesSideCol, stylesReorderSide]}>
            {children}
        </div>
    );
}