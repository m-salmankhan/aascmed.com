import { App } from "./app";
import { NavBar } from "../header";
import React, { ReactNode } from "react";
import { css } from "@emotion/react";
import { cols, gridContainer, offsetCols } from "../../styles/grid";
import { breakpointStrings, mediaBreakpoints } from "../../styles/breakpoints";
import { Container } from "../containers";
import { gridSpacing } from "../../styles/theme";
import { CSSInterpolation } from "@emotion/serialize";
import { Footer } from "../footer";

interface PrimarySecondaryColumnsLayoutProps {
    children: ReactNode,
    className?: string
}
interface ColumnProps {
    children: ReactNode,
    className?: string
}
export const PrimarySecondaryColumnsLayout = ({ children, className }: PrimarySecondaryColumnsLayoutProps): React.ReactElement => {
    return (
        <App className={className} >
            <NavBar />
            <Container id={"main"}>
                {children}
            </Container>
            <Footer />
        </App>
    );
}

export const Columns = ({ children, className }: PrimarySecondaryColumnsLayoutProps): React.ReactElement =>
    <div css={[gridContainer(), { margin: `0 -${gridSpacing / 2}em` }]} className={className}>
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
export const MainCol = ({ children, className }: ColumnProps): React.ReactElement => {
    return (
        <div className={className} css={[stylesMainCol, stylesReorderMain]}>
            {children}
        </div>
    );
}
const stylesSideCol = css(
    cols(12),
    cols(4, mediaBreakpoints.md),
    {}
);
const stylesReorderSide: CSSInterpolation = {
    order: 0,
};
stylesReorderSide[breakpointStrings.md] = {
    order: 1,
}
export const SideCol = ({ children, className }: ColumnProps): React.ReactElement => {
    return (
        <div className={className} css={[stylesSideCol, stylesReorderSide]}>
            {children}
        </div>
    );
}