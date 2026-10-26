import { ContactForm } from "./index";
import { css } from "@emotion/react";
import React from "react";
import { stylesBigH1 } from "../headings";
import { cols, gridContainer } from "../../styles/grid";
import { breakpointStrings, mediaBreakpoints } from "../../styles/breakpoints";
import { colours, gridSpacing } from "../../styles/theme";

/** Contact section copy and clinic labels supplied by its page or view. */
interface ContactSectionProps {
  className?: string
  title: string
  textContent?: React.ReactNode
  /** Clinic labels shown in the preferred-location selector. */
  clinicOptions: readonly string[]
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
      
      strong {
        color: #fff;
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

/** Render contact copy and a form with the page's available clinic labels.
 * @param props Heading, optional copy, clinic labels, and presentation class.
 * @returns The contact section with its clinic-aware form.
 */
export function ContactSection(props: ContactSectionProps): React.ReactElement {
  return (
    <section className={props.className} css={cols(12)}>
      <h2 css={stylesBigH1}>{props.title}</h2>
      <div css={[gridContainer(), css`margin: 0 -${gridSpacing / 2}rem`]}>
        <div css={stylesSideNotice}>
          <div>
            {props.textContent}
          </div>
        </div>
        <div css={stylesForm}>
          <ContactForm clinicOptions={props.clinicOptions} />
        </div>
      </div>
    </section>
  )
}
