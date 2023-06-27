import {css} from "@emotion/react";
import {defaultTotalColumnCount, gridSpacing} from "./theme";

// Returns CSS to turn element into Flexbox Grid Container
export const gridContainer = (breakpoint: number = 0) => {
    const breakpointStyles = {}

    breakpointStyles[`@media screen and (min-width: ${breakpoint}em)`] = {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
    };

    return css(breakpointStyles)
};

/*
* @param {number} columnSpan  - The number of columns this element should occupy
* @param {number} [totalColumnCount=12] - The total number of columns
* @returns {string} - Percentage width of the element
*/
const colsWidth = (columnSpan: number, totalColumnCount: number = defaultTotalColumnCount) =>
    `${100 * columnSpan / totalColumnCount}%`;

/*
* Return the styles to size and pad an element.
* @param {number} colspan - The number of columns to occupy
* @param {number} [breakpoint = 0] - Breakpoint position (min-width) in em
* @param {number} [totalColumnCount=12] - The total number of columns
* @returns {SerializedStyles} Emotion CSS for element of correct width and padding
* */
export const cols = (colspan: number, breakpoint: number = 0, totalColumnCount: number = defaultTotalColumnCount) => {
    const breakpointStyles = {}
    breakpointStyles[`@media screen and (min-width: ${breakpoint}em)`] = {
        width: colsWidth(colspan, totalColumnCount),
        paddingLeft: `${gridSpacing/2}em`,
        paddingRight: `${gridSpacing/2}em`,
    };

    return css(breakpointStyles)
}

/*
Offset a column by a certain number of columns
* @param {number} cols - The number of columns to offset
* @param {number} [breakpoint = 0] - Breakpoint position (min-width) in em
* @param {number} [totalColumnCount=12] - The total number of columns
* @returns {SerializedStyles} Emotion CSS for offsetting element
* */
export const offsetCols = (cols: number, breakpoint: number = 0, totalColumnCount: number = defaultTotalColumnCount) => {
    const breakpointStyles = {}
    breakpointStyles[`@media screen and (min-width: ${breakpoint}em)`] = {
        marginLeft: colsWidth(cols, totalColumnCount),
    };

    return css(breakpointStyles)
}

/*
Pull a column by a certain number of columns
* @param {number} cols - The number of columns to pull by
* @param {number} [breakpoint = 0] - Breakpoint position (min-width) in em
* @param {number} [totalColumnCount=12] - The total number of columns
* @returns {SerializedStyles} Emotion CSS for pulling element
* */
export const pullCols = (cols: number, breakpoint: number = 0, totalColumnCount: number = defaultTotalColumnCount) => {
    const breakpointStyles = {}
    breakpointStyles[`@media screen and (min-width: ${breakpoint}em)`] = {
        marginLeft: `calc(-1 * ${colsWidth(cols, totalColumnCount)})`,
    };

    return css(breakpointStyles)
}