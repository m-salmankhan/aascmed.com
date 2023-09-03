// width in em of each breakpoint
export const mediaBreakpoints = {
    sm: 30,
    md: 60,
    lg: 90,
    xl: 100,
}

// contains breakpoint strings for each breakpoint
export const breakpointStrings = {
    sm: `@media screen and (min-width: ${mediaBreakpoints.sm}em)`,
    md: `@media screen and (min-width: ${mediaBreakpoints.md}em)`,
    lg: `@media screen and (min-width: ${mediaBreakpoints.lg}em)`,
    xl: `@media screen and (min-width: ${mediaBreakpoints.xl}em)`,
}