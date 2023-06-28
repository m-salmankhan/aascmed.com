import {ReactNode} from "react";
import {
    PrimaryAnchor,
    SecondaryButton,
    stylesBtnSecondary,
    stylesButton
} from "../buttons";
import {Link} from "gatsby";
import {colours, gridSpacing} from "../../styles/theme";
import {css} from "@emotion/react";
import {H1, stylesH2, stylesH3, stylesH4} from "../headings";
import {CSSInterpolation} from "@emotion/serialize";

interface ShortCodeProps {
    children?: ReactNode,
    className?: string,
}

const stylesButtonList = css({
    margin: `${gridSpacing/2}em 0`,
});

const stylesFAQBtn = css({
    "&:hover, &focus": {
        backgroundColor: colours.infoYellow,
        color: colours.infoBlue,
        borderColor: colours.infoBlue,
    }
});

const stylesContactBtn = css({
    margin: `${gridSpacing/2}em`
});

export const ButtonList: React.FC<ShortCodeProps> = ({className, children}) =>
    <nav className={className} css={stylesButtonList}>
        {children}
        <PrimaryAnchor href={"#frequently-asked-questions"} css={stylesFAQBtn}>Skip to FAQ</PrimaryAnchor>
        <Link css={[stylesButton, stylesBtnSecondary, stylesContactBtn]} to={"/contact"}>Get in Touch</Link>
        <SecondaryButton onClick={() => {}}>Book online with ZocDoc</SecondaryButton>
    </nav>


const stylesContactBanner: CSSInterpolation = {
    margin: `${gridSpacing*2}em 0`,
    background: colours.brandPrimary,
    padding: `${gridSpacing}em`,
    color: colours.bodyBackground,

    "h1": [stylesH2, {
        marginTop: 0,
        color: colours.bodyBackground,
    }]
}

export const ContactBanner: React.FC<ShortCodeProps> = ({className, children}) =>
    <aside className={className} css={stylesContactBanner}>
        <H1>Questions? Drop us a note!</H1>
        <p>If you have any questions, get in touch with us! You can contact us by telephone on (815) 729 9900 or by email at info@aascmed.com. Or you can fill in our contact form.</p>
        <Link css={[stylesButton, stylesBtnSecondary, {marginRight: `${gridSpacing/2}em`}]} to={"/contact"}>Contact Us</Link>
        <SecondaryButton onClick={() => {}}>Book online with ZocDoc</SecondaryButton>
    </aside>