import React, {ComponentProps, ReactNode, useId} from "react";
import {inputBorderWidths, inputFocusShadow, inputMargins, inputPadding, stylesLabel} from "./index";
import {css} from "@emotion/react";
import {colours} from "../../styles/theme";

interface DropdownInputProps extends Omit<ComponentProps<"select">, "id"> {
    label: string | ReactNode
    children: ReactNode
    error?: string | ReactNode
}

const stylesDropdownInput = (error: boolean) => css`
  margin: ${inputMargins};
  
  select {
    width: 100%;
    font-size: 1em;
    color: #000;
    background: #fff;
    padding: ${inputPadding};
    border: ${inputBorderWidths.regular} solid ${error ? colours.errTxt : colours.brandPrimary};
    transition: border-left-width .5s ease 0s;

    &:focus {
      outline: none;
      border-left-width: ${inputBorderWidths.focus};
      box-shadow: ${inputFocusShadow};
    }
  }
`

export const DropdownInput: React.FC<DropdownInputProps> = (props) => {
    const id = useId();
    return (
        <div className={props.className} css={stylesDropdownInput(!!props.error)}>
            <label css={stylesLabel(!!props.error)} htmlFor={id}>{props.label}</label>
            <select>
                {props.children}
            </select>
        </div>
    );
}