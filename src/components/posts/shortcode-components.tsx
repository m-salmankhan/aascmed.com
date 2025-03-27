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
import { FaIcons, IconStyles } from "../font-awesome";

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

    "h1, h2": [stylesH2, {
        marginTop: 0,
        color: colours.bodyBackground,
    }]
}

export const ContactBanner: React.FC<ShortCodeProps> = ({ className, children }) =>
    <aside className={className} css={stylesContactBanner}>
        <h2>Questions? Drop us a note!</h2>
        <p>If you have any questions, get in touch with us! You can contact us by telephone on (815) 729 9900 or by email at info@aascmed.com. Or you can fill in our contact form.</p>
        {children}
        <Link css={[stylesButton, stylesBtnSecondary, { marginRight: `${gridSpacing / 2}em` }]} to={"/contact"}>Contact Us</Link>
        <SecondaryAnchor href={ZocDocURL} target="_BLANK" rel="noopener">Book online with ZocDoc</SecondaryAnchor>
    </aside>

const stylesInfoNotice: CSSInterpolation = {
    margin: `${gridSpacing / 2}em 0`,
    background: colours.infoYellow,
    padding: `${gridSpacing/2}em`,
    color: colours.infoBlue,
    borderRadius:  `${gridSpacing/4}em`,

    a: {
        color: colours.infoBlue,
    },

    "p:first-child": {
        marginTop: 0,
    },
    "p:last-child": {
        marginBottom: 0,
    },
    
    ".icon": {
        display: "inline-block",
        width: `1em`,
        height: `1em`,
        fill: colours.infoBlue,
        verticalAlign: "middle",
        marginRight: `${gridSpacing/4}em`,
    } 
}
export const InfoNotice: React.FC<ShortCodeProps> = ({className, children}) =>
    <div className={className} css={stylesInfoNotice}>
        <FaIcons iconStyle={IconStyles.SOLID} icon={"circle-info"} className={"icon"} /> <strong>Info:</strong>
        {children}
    </div>

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
