/*
===== GRID ====
*/
// width in vw that containers should be
import { keyframes } from "@emotion/react";

export const containerWidths = {
  xs: 90,
  sm: 85,
  md: 80,
  lg: 70,
  xl: 65,
}

export const gridSpacing = 2;
export const defaultTotalColumnCount = 12;

/*
===== Typography ====
*/

export const fontFamily = "Poppins, sans-serif";
export const fontWeightBase = 300;
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