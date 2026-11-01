/*
===== GRID ====
*/
import { keyframes } from "@emotion/react";

/** Maximum width of shared page content; full-bleed backgrounds remain uncapped. */
export const contentMaxWidth = "80rem";
/** One gutter formula for centered and padded containers, relative to their parent. */
export const contentGutter = `max(clamp(1rem, 3%, 3rem), (100% - ${contentMaxWidth}) / 2)`;

export const gridSpacing = 2;
export const defaultTotalColumnCount = 12;

/*
===== Typography ====
*/

export const fontFamily = "Poppins, sans-serif";
export const fontWeightBase = 300;
export const fontWeightBold = 800;
export const fontWeightHeadings = 800;
export const fontBaseSize = "16px";

/*
===== Colours ====
*/
export const colours = {
  bodyBackground: "#f7f7f7",
  brandPrimary: "#1C5E38",
  brandSecondary: "#4DA249",
  brandGradient: "TBA",
  brandGradientReverse: "TBA",

  errBg: "#FFBFBB",
  errTxt: "#770000",
  successBg: "#e0ffcf",
  successTxt: "#013c1a",


  infoBlue: "#0C206E",
  infoYellow: "#FFCF00",

  darkGreen: "#003B19",
  lightGreen: "#C8FFDE",

  selectionBgLight: "#A41380",
  selectionTxtLight: "#fff",
  selectionBgDark: "#f6ff00",
  selectionTxtDark: "#000",
}
colours["brandGradient"] = `linear-gradient(to right, ${colours.brandPrimary}, ${colours.brandSecondary})`;
colours["brandGradientReverse"] = `linear-gradient(to left, ${colours.brandPrimary}, ${colours.brandSecondary})`;

/*
===== Transitions ====
*/
export const bounceTransition = "cubic-bezier(1, -1.28, 0.25, 1.95)";
export const alternativeBounceTransition = "cubic-bezier(0.32, -0.04, 0, 1.71)";

export const nudge = keyframes`
    0% {
      transform: rotate(-1deg) translateX(-5px);
    }
    50% {
      transform: rotate(1deg) translateX(5px);
    }
    100% {
      transform: rotate(0) translateX(0);
    }
`;