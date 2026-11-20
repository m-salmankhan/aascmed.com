import React, { ReactNode } from "react";
import { css } from "@emotion/react";
import { cols, gridContainer } from "../../styles/grid";
import { breakpointStrings, mediaBreakpoints } from "../../styles/breakpoints";
import { gridSpacing } from "../../styles/theme";

interface ColumnGroupProps { children: ReactNode; className?: string }
interface ColumnProps { children: ReactNode; className?: string }

export const Columns = ({ children, className }: ColumnGroupProps): React.ReactElement =>
  <div css={[gridContainer(), { margin: `0 -${gridSpacing / 2}em` }]} className={className}>{children}</div>;

const stylesColumn = css(
  cols(12),
  cols(6, mediaBreakpoints.md),
  css`
    &.half-column:nth-of-type(2) {
      margin-top: ${gridSpacing}em;
      ${breakpointStrings.md} { margin: 0; }
    }
  `,
);

export const Column = ({ children, className }: ColumnProps): React.ReactElement =>
  <div className={`half-column${className ? ` ${className}` : ""}`} css={stylesColumn}>{children}</div>;
