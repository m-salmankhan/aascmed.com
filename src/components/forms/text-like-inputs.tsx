import React, { ReactNode, useId } from "react";
import { css } from "@emotion/react";
import { colours } from "../../styles/theme";
import { ErrorNotice } from "./notices";
import Color from "color";
import { inputBorderWidths, inputFocusShadow, inputMargins, inputPadding, stylesLabel } from "./index";

interface InputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "type" | "id"> {
  type: "text" | "email" | "password" | "tel" | "search" | "url",
  label: string | ReactNode
  error?: ReactNode | string
}

interface TextAreaProps extends Omit<React.ComponentPropsWithoutRef<"textarea">, "type" | "id"> {
  label: string | ReactNode
  error?: ReactNode | string
}

const stylesTextInputs = (error: boolean) => css`
  margin: ${inputMargins};
  
  label, input, textarea {
    display: block;
  }
  
  input, textarea {
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
    
    &::placeholder {
      font-weight: bold;
      color: ${Color(colours.brandSecondary).desaturate(1).toString()}
    }
    
  }
`

export const TextInput: React.FC<InputProps> = (props) => {
  const id = useId();
  return (
    <div css={stylesTextInputs(!!props.error)} className={props.className}>
      <label css={stylesLabel(!!props.error)} htmlFor={id}>{props.label} {props.required && "(required)"}:</label>
      {
        props.error &&
        <ErrorNotice css={css`margin-bottom: 1em;`}>{props.error}</ErrorNotice>
      }
      <input id={id} {...props} />
    </div>
  );
}

export const TextArea: React.FC<TextAreaProps> = (props) => {
  const id = useId();
  return (
    <div css={stylesTextInputs(!!props.error)} className={props.className}>
      <label css={stylesLabel(!!props.error)} htmlFor={id}>{props.label} {props.required && "(required)"}:</label>
      {
        props.error &&
        <ErrorNotice css={css`margin-bottom: 1em;`}>{props.error}</ErrorNotice>
      }
      <textarea id={id} {...props} />
    </div>
  );
}