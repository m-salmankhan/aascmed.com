import React, {ComponentProps, ReactNode, useId} from "react";
import {inputFocusShadow, inputMargins, stylesLabel} from "./index";
import {ErrorNotice} from "./notices";
import {css} from "@emotion/react";
import {colours} from "../../styles/theme";

interface CheckboxProps extends Omit<ComponentProps<"input">, "id" | "type"> {
    label: string | ReactNode
    error?: string | ReactNode
}

const stylesCheckboxInput = (error: boolean) => css`
  margin: ${inputMargins};
  
  input {
    display: inline-block;
    margin-right: 1em;
  }
  
  label {
    display: inline;
    color: ${error ? colours.errTxt : "black"};
    font-weight: normal;
    text-transform: none;
  }
  
  input:focus ~ label {
    text-decoration: underline;
  }
`;

export const Checkbox: React.FC<CheckboxProps> = (props) => {
    const id = useId();

    return (
        <div css={stylesCheckboxInput(!!props.error)} className={props.className}>
            {
                props.error &&
                <ErrorNotice css={css`margin-bottom: 1em;`}>{props.error}</ErrorNotice>
            }

            <input id={id} type={"checkbox"} {...props} />
            <label css={stylesLabel(!!props.error)} htmlFor={id}>{props.label} {props.required && "(required)"}</label>
        </div>
    );
}