import { ContactForm } from "./index";
import { css } from "@emotion/react";
import React from "react";
import { stylesBigH1 } from "../headings";
import { cols, gridContainer } from "../../styles/grid";
import { breakpointStrings, mediaBreakpoints } from "../../styles/breakpoints";
import { colours, gridSpacing } from "../../styles/theme";
import ReactMarkdown from "react-markdown";

interface ContactSectionProps {
  className?: string
  title: string
  text: string
}

const stylesSideNotice = css(
  cols(12),
  cols(4, mediaBreakpoints.md),
  css`
      background: ${colours.brandPrimary};
      background-clip: content-box;
      color: #fff;
      margin-bottom: 1em;
      
      a {
        color: #fff;
      }
      
      > div {
        padding: 1em;
      }
    `
);

const stylesForm = css(
  cols(12),
  cols(8, mediaBreakpoints.md),
  css`
      margin-bottom: 1em;
      
      ${breakpointStrings.md} {
        padding-left: 2em;
      }
      button[type="submit"] {
        width: 100%;
      }
    `
);

export const ContactSection: React.FC<ContactSectionProps> = (props) => {
  return (
    <section className={props.className} css={cols(12)}>
      <h2 css={stylesBigH1}>{props.title}</h2>
      <div css={[gridContainer(), css`margin: 0 -${gridSpacing / 2}rem`]}>
        <div css={stylesSideNotice}>
          <div>
            <ReactMarkdown>
              {props.text}
            </ReactMarkdown>
          </div>
        </div>
        <div css={stylesForm}>
          <ContactForm />
        </div>
      </div>
    </section>
  )
}