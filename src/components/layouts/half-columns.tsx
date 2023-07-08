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

interface HalfColumnProps {
    children: ReactNode,
    className?: string
}
interface ColumnProps {
    children: ReactNode,
    className?: string
}
export const HalfColumnsLayout: React.FC<HalfColumnProps> = ({ children, className }) => {
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

export const Columns: React.FC<HalfColumnProps> = ({ children, className }) =>
    <div css={[gridContainer(), { margin: `0 -${gridSpacing / 2}em` }]} className={className}>
        {children}
    </div>


const stylesColumn = css(
    cols(12),
    cols(6, mediaBreakpoints.md),
    css`
        &:nth-child(2) {
          margin-top: ${gridSpacing}em;
          
          ${breakpointStrings.md} {
            margin: 0;
          }
        }
    `
);
export const Column: React.FC<ColumnProps> = ({ children, className }) => {
    return (
        <div className={className} css={[stylesColumn]}>
            {children}
        </div>
    );
}
