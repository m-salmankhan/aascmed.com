import React, { ReactNode } from "react";
import {
    PrimaryAnchor, SecondaryAnchor,
    stylesBtnSecondary,
    stylesButton
} from "../buttons";
import { Link } from "gatsby";
import { colours, gridSpacing } from "../../styles/theme";
import { css } from "@emotion/react";
import { H2, stylesH2 } from "../headings";
import { CSSInterpolation } from "@emotion/serialize";
import { ZocDocURL } from "../zocdoc";

interface ShortCodeProps {
    children?: ReactNode,
    className?: string,
}

const stylesButtonList = css({
    margin: `${gridSpacing / 2}em 0`,
});

const stylesFAQBtn = css({
    "&:hover, &focus": {
        backgroundColor: colours.infoYellow,
        color: colours.infoBlue,
        borderColor: colours.infoBlue,
    }
});

const stylesContactBtn = css({
    margin: `${gridSpacing / 2}em`
});

export const ButtonList: React.FC<ShortCodeProps> = ({ className, children }) =>
    <nav className={className} css={stylesButtonList}>
        {children}
        <PrimaryAnchor href={"#faq"} css={stylesFAQBtn}>Skip to FAQ</PrimaryAnchor>
        <Link css={[stylesButton, stylesBtnSecondary, stylesContactBtn]} to={"/contact"}>Get in Touch</Link>
        <SecondaryAnchor href={ZocDocURL} target={"_BLANK"} rel={"noopener"}>Book online with ZocDoc</SecondaryAnchor>
    </nav>


const stylesContactBanner: CSSInterpolation = {
    margin: `${gridSpacing * 2}em 0`,
    background: colours.brandPrimary,
    padding: `${gridSpacing}em`,
    color: colours.bodyBackground,

    "h1, h2": [{
        marginTop: 0,
        color: colours.bodyBackground,
    }]
}

export const ContactBanner: React.FC<ShortCodeProps> = ({ className, children }) =>
    <aside className={className} css={stylesContactBanner}>
        <H2 css={css({color: colours.bodyBackground})}>Questions? Drop us a note!</H2>
        <p>If you have any questions, get in touch with us! You can contact us by telephone on (815) 729 9900 or by email at info@aascmed.com. Or you can fill in our contact form.</p>
        {children}
        <Link css={[stylesButton, stylesBtnSecondary, { marginRight: `${gridSpacing / 2}em` }]} to={"/contact"}>Contact Us</Link>
        <SecondaryAnchor href={ZocDocURL} target="_BLANK" rel="noopener">Book online with ZocDoc</SecondaryAnchor>
    </aside>

interface FAQProps {
    children: ReactNode
    className?: string
}
const stylesFAQ = css`
h1,
h2,
h3,
h4,
h5,
h6 {
    font-size: 1rem;
}
`;
export const FAQ: React.FC<FAQProps> = (props) =>
    <div id="faq" css={stylesFAQ}>
        {props.children}
    </div>
