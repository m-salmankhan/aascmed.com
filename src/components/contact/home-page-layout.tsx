import {ContactForm} from "./index";
import {css} from "@emotion/react";
import React from "react";
import {H2} from "../headings";
import {cols, gridContainer} from "../../styles/grid";
import {breakpointStrings, mediaBreakpoints} from "../../styles/breakpoints";
import {colours} from "../../styles/theme";

interface ContactSectionProps {
    className?: string
}

const stylesSideNotice = css(
    cols(12),
    cols(4, mediaBreakpoints.md),
    css`
      background: ${colours.brandPrimary};
      color: #fff;
      padding: 1em;
    `
);

const stylesForm = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
    css`
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
            <H2 css={css`font-size: 2.5rem`}>Contact Us</H2>
            <div css={gridContainer()}>
                <div css={stylesSideNotice}>
                    <p>For general enquiries, please contact our Joliet office at 815 729 9900, email info@aascmed.com, or fill in the contact form.</p>

                    <p>To book an appointment, contact the clinic of your choice at the relevant telephone number listed below or fill in the contact form and select your chosen location.</p>

                    <p><strong>Please ensure that you do not put any personal health information in the message.</strong> This contact form is not intended to be used to transmit sensitive information such as PHI as it will be stored with a third-party. Read our website's privacy policy to learn more.</p>
                </div>
                <div css={stylesForm}>
                    <ContactForm />
                </div>
            </div>
        </section>
    )
}