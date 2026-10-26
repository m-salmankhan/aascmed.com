import { colours, fontBaseSize, fontFamily, fontWeightBase, fontWeightBold, gridSpacing } from "./theme";
import { CSSInterpolation } from "@emotion/serialize";

export const stylesGlobal: CSSInterpolation = {
    "html, body": {
        padding: 0,
        margin: 0,
        height: "100%",
        fontFamily: fontFamily,
        fontSize: fontBaseSize,
        fontWeight: fontWeightBase,
        background: colours.bodyBackground,
        scrollBehavior: "smooth",
        scrollMargin: gridSpacing + "em",
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
            margin: `${gridSpacing / 2}em 0 ${gridSpacing / 2}em 1em`,
        },
    },

    ul: {
        listStyleType: "disc",
    },
    li: {
        margin: `${gridSpacing / 3}em 0`,
    },

    p: {
        marginBottom: "1.5em",
    },

    strong: {
        fontWeight: `${fontWeightBold}`,
        color: colours.brandPrimary,
    },

    // Base styles for code elements
    code: {
        fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
        fontSize: "0.9em",
        backgroundColor: "rgba(0, 0, 0, 0.06)",
        padding: "0.2em 0.4em",
        borderRadius: "3px",
    },

    pre: {
        fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
        fontSize: "0.9em",
        backgroundColor: "rgba(0, 0, 0, 0.06)",
        padding: "1em",
        borderRadius: "6px",
        overflowX: "auto",
        "code": {
            backgroundColor: "transparent",
            padding: 0,
        },
    },

    blockquote: {
        borderLeft: `4px solid ${colours.brandSecondary}`,
        margin: "1.5em 0",
        padding: "0.5em 1em",
        backgroundColor: "rgba(0, 0, 0, 0.02)",
        fontStyle: "italic",
        "p:last-child": {
            marginBottom: 0,
        },
    },

    hr: {
        border: "none",
        borderTop: `1px solid rgba(0, 0, 0, 0.1)`,
        margin: "2em 0",
    },

    mark: {
        backgroundColor: colours.infoYellow,
        padding: "0.1em 0.2em",
    },

    kbd: {
        fontFamily: "'Fira Code', 'Consolas', 'Monaco', monospace",
        fontSize: "0.85em",
        backgroundColor: "#fafafa",
        border: "1px solid #ccc",
        borderRadius: "3px",
        boxShadow: "0 1px 1px rgba(0,0,0,0.1)",
        padding: "0.1em 0.4em",
    },

    table: {
        borderCollapse: "collapse",
        width: "100%",
        marginBottom: "1.5em",
    },

    "th, td": {
        border: "1px solid rgba(0, 0, 0, 0.1)",
        padding: "0.5em 0.75em",
        textAlign: "left",
    },

    th: {
        backgroundColor: "rgba(0, 0, 0, 0.04)",
        fontWeight: fontWeightBold,
    },

};