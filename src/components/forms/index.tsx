import {TextInput, TextArea} from "./text-like-inputs";
import {DropdownInput} from "./dropdown-input";
import {Checkbox} from "./checkbox";
import {colours} from "../../styles/theme";
import {css} from "@emotion/react";

export const inputBorderWidths = {
    focus: "1rem",
    regular: "0.2rem",
}
export const inputPadding = "0.5rem";
export const inputMargins = "1rem 0";
export const inputFocusShadow = "0 0 1em rgba(0, 0, 0, 0.5)";


export const stylesLabel = (error: boolean) => css`
    color: ${error ? colours.errTxt : colours.brandPrimary};
    font-weight: bold;
    text-transform: uppercase;
    margin: 0 0 .5em;
`

export {
    TextInput,
    TextArea,
    Checkbox,
    DropdownInput,
}