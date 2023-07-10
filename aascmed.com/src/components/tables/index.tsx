import React, {HTMLProps} from "react";
import {css} from "@emotion/react";
import {colours, gridSpacing} from "../../styles/theme";

const stylesTable = css`
  width: 100%;
  border-collapse: collapse;

  thead, tr.faux-head {
    background: ${colours.brandPrimary};
    color: #fff;
    font-weight: bold;
    
    td {
      border: none;
      text-align: center;
    }
  }
  
  td {
    padding: ${gridSpacing / 4}em;
    border: 1px solid darkgray;
  }

`
export const Table: React.FC<HTMLProps<HTMLTableElement>> = (props) =>
    <table css={stylesTable} {...props}>

    </table>