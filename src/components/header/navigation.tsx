import React, {MouseEventHandler, useEffect, useId, useRef, useState} from "react";
import {css} from "@emotion/react";
import {Link} from "gatsby";
import {stylesScreenReaderText} from "../../styles/accessibility";
import {HorizontalLogo, StackedLogo} from "../logo";
import {FaIcons, IconStyles} from "../font-awesome";
import {bounceTransition, colours, gridSpacing} from "../../styles/theme";
import {CSSInterpolation} from "@emotion/serialize";
import {breakpointStrings, mediaBreakpoints} from "../../styles/breakpoints";
import {cols, gridContainer, offsetCols} from "../../styles/grid";

const stylesActiveNavElement = css({
    ", &:hover": {
        borderBottom: "5px solid white",
        color: "#fff",
        background: "none",
    }
});

type NavItemProps = JSX.IntrinsicElements["li"] & {
    link: string,
    onLinkClicked?: MouseEventHandler<HTMLAnchorElement>,
};
const NavItem: React.FC<NavItemProps> = ({ link, onLinkClicked, children, ...props }) =>
    <li {...props}>
        {
            (link.startsWith(`https://`)) ?
                <a href={link} target="_BLANK" rel="noreferrer" >{children}</a> :
                (link==="#") ?
                    <a href="https://www.zocdoc.com/practice/allergy-asthma-and-sinus-centers-3233" onClick={onLinkClicked} >{children}</a> :
                    <Link css={stylesActiveNavElement} to={link}>{children}</Link>
        }
    </li>


interface NavigationProps {
    siteTitle: string,
}

enum NavigationMenuStates {
    EXPANDED,
    COLLAPSING,
    COLLAPSED,
    PRE_EXPANDING,
    EXPANDING,
}

const stylesSkipToMain = css(stylesScreenReaderText, {
    display: "block",
    backgroundColor: "#fff",
    color: "$brand-primary",
    boxShadow:" 0 0 1rem rgba(#000, 0.5)",
    border: "1px solid $brand-primary",
    fontWeight: "bold",
    position: "fixed",
    top: 0,
    left: 0,
    zIndex: 1,
    "&:focus": {
        border: 0,
        clip: "auto",
        clipPath: "none",
        height: "auto",
        margin: 0,
        overflow: "visible",
        padding: "1rem",
        position: "absolute",
        top: 0,
        left: 0,
        width: "auto",
        wordWrap: "normal",
        outline: "none",
    }
});

const stylesNav = css(
    gridContainer(mediaBreakpoints.lg),
    {
        justifyContent: "space-between",
        alignItems: "center",
    }
);

const stylesToggleButton: CSSInterpolation = {
    textAlign: "center",

    button: {
        fontSize: "1rem",
        textTransform: "uppercase",
        fontWeight: "bold",
        border: "none",
        outline: "none",
        background: "none",
        color: "white",
        margin: "1rem auto",
        cursor: "pointer",
        padding: "0.5rem",

        svg: {
            width: "1rem",
            height: "1rem",
            fill: "#fff",
            verticalAlign: "middle",
            marginRight: "0.5rem",
            transition: "transform 0.5s ease-in-out 0s",
        },

        "&:focus": {
            background: "#fff",
            color: colours.brandPrimary,

            svg: {
                fill: colours.brandPrimary,
                transform: "rotate(180deg)",
            }
        }
    }
};

stylesToggleButton[breakpointStrings.md] = {
    display: "none",
}


const stylesLogoLink = css(
    cols(3, mediaBreakpoints.lg),
    {
        svg: {
            width: "100%",
            fill: "#fff",
            transition: `all 1s ${bounceTransition} 0s`,
        },

        "&:focus, &:active": {
            svg: {
                transform: "scale(0.8)"
            },
        }
    }
);

// only show one logo at a time
const stylesHorizontalLogo: CSSInterpolation = {
    display: "none",
}
stylesHorizontalLogo[breakpointStrings.lg] = {
    display: "block",
}

const stylesStackedLogo: CSSInterpolation = {
    margin: `0 auto ${gridSpacing}em`,
    display: "block",
}
stylesStackedLogo[breakpointStrings.lg] = {
    display: "none",
}


const stylesNavigationUl = (state: NavigationMenuStates) => {
    const stylesExpanded = css(
        cols(12),
        cols(9, mediaBreakpoints.lg),
        // offsetCols(1, mediaBreakpoints.lg),
        {
            padding: 0,
            margin: "0 auto",
            textAlign: "center",
            listStyle: "none",
            overflow: "hidden",
            transition: "max-height 1s ease-in-out 0s",

            li: {
                fontWeight: "bold",
                display: "block",
                letterSpacing: "0.025rem",
                padding: `${gridSpacing/4}em 0`,
            },

            "a, button": {
                color: "#fff",
                textDecoration:" none",
                background:" transparent",
                border:" none",
                verticalAlign:" middle",
                padding: "5px 0",

                "&.active, &.active:hover": {
                    borderBottom: "5px solid white",
                    color: "#fff",
                    background: "none",
                },

                "&:focus, &:hover, &:active":  {
                    color: colours.infoBlue,
                    background: colours.infoYellow,
                    outline: "none",
                    border: "none",
                    textDecoration: "none",
                    borderBottom: `5px solid ${colours.infoBlue}`,
                },
            }
        }
    );

    const inlineItems = css(stylesExpanded, {
        "li": {
            display: "inline-block",
            padding: `0 ${gridSpacing/2}em`,
        }
    });

    if(typeof window !== "undefined") {
        const isMediumScreen = matchMedia(`screen and (min-width: ${mediaBreakpoints.md}em)`).matches ;
        const isLargeScreen = matchMedia(`screen and (min-width: ${mediaBreakpoints.lg}em)`).matches ;

        if (isMediumScreen) {
            return inlineItems;
        }

        if (isLargeScreen) {
            return css(inlineItems, {textAlign: "right"});
        }
    }

    const stylesExpanding = css(stylesExpanded, {
        maxHeight: "60em",
    });

    const stylesCollapsing = css(stylesExpanded, {
        maxHeight: "0em",
    });

    const stylesCollapsed = css(stylesCollapsing, {
        display: "none",
    });


    switch (state) {
        case NavigationMenuStates.COLLAPSED:
            return stylesCollapsed;
        case NavigationMenuStates.COLLAPSING:
            return stylesCollapsing;
        case NavigationMenuStates.EXPANDED:
            return stylesExpanding;
        case NavigationMenuStates.EXPANDING:
            return stylesExpanding;
        case NavigationMenuStates.PRE_EXPANDING:
            return stylesCollapsing;
    }
}

interface NavigationProps {
    siteTitle: string,
    frontPage: boolean,
    className?: string,
}
export const Navigation: React.FC<NavigationProps> = ({siteTitle, frontPage, className}) => {
    const [collapsedState, setCollapsedState] = useState(NavigationMenuStates.EXPANDED);
    const listId = useId();
    const listRef = useRef<HTMLUListElement | null>(null);
    const [jsEnabled, setJSEnabled] = useState(false);

    // set JSEnabled to true
    useEffect(() => {
        setJSEnabled(true);
        if(!matchMedia(`screen and (min-width: ${mediaBreakpoints.md}em)`).matches) {
            setCollapsedState(NavigationMenuStates.COLLAPSED);
        }
    }, [setJSEnabled]);

    // progress the state after making it visible again
    useEffect(() => {
        if (collapsedState === NavigationMenuStates.PRE_EXPANDING) {
            setCollapsedState(NavigationMenuStates.EXPANDING);
        }
    }, [collapsedState, setCollapsedState]);

    const transitionEndHandler = () => {
        switch (collapsedState) {
            case NavigationMenuStates.COLLAPSED:
                setCollapsedState(NavigationMenuStates.EXPANDING);
                break

            case NavigationMenuStates.EXPANDED:
                setCollapsedState(NavigationMenuStates.COLLAPSING);
                break

            // This doesn't case a transition so there is no handler
            case NavigationMenuStates.PRE_EXPANDING:
                break

            case NavigationMenuStates.EXPANDING:
                setCollapsedState(NavigationMenuStates.EXPANDED);
                break

            case NavigationMenuStates.COLLAPSING:
                setCollapsedState(NavigationMenuStates.COLLAPSED);
                break
        }
    };

    const bookingsClickHandler = () => {

    }

    const toggleMenu = () => {
        switch (collapsedState) {
            case NavigationMenuStates.COLLAPSED:
                setCollapsedState(NavigationMenuStates.PRE_EXPANDING);
                break

            case NavigationMenuStates.EXPANDED:
                setCollapsedState(NavigationMenuStates.COLLAPSING);
                break

            case NavigationMenuStates.PRE_EXPANDING:
                break

            case NavigationMenuStates.EXPANDING:
                setCollapsedState(NavigationMenuStates.COLLAPSING);
                break

            case NavigationMenuStates.COLLAPSING:
                setCollapsedState(NavigationMenuStates.EXPANDING);
                break
        }
    }

    return (
        <div className={className}>
            <a css={stylesSkipToMain} href="#main">Skip to main content</a>
            <nav css={stylesNav}>
                <Link css={stylesLogoLink} to="/">
                    <HorizontalLogo css={stylesHorizontalLogo} />
                    <StackedLogo css={stylesStackedLogo} />
                    {(frontPage) ?
                        <h1 css={stylesScreenReaderText}>{ siteTitle }</h1> :
                        <span css={stylesScreenReaderText}>{ siteTitle }</span>
                    }
                </Link>

                {/* Toggle Button (show only if JS enabled) */}
                {
                    jsEnabled ?
                        <div css={css(stylesToggleButton)}>
                            <button aria-expanded={collapsedState !== NavigationMenuStates.COLLAPSED} onClick={toggleMenu} aria-controls={listId}>
                                <FaIcons iconStyle={IconStyles.SOLID} icon="bars" />
                                Menu
                            </button>
                        </div> : <></>
                }

                <ul id={listId} ref={listRef} css={stylesNavigationUl(collapsedState)} onTransitionEnd={transitionEndHandler} aria-hidden={collapsedState === NavigationMenuStates.COLLAPSED}>
                    <NavItem link="/conditions/">Patient Education</NavItem>
                    <NavItem link="/providers/">Our Team</NavItem>
                    <NavItem link="/clinics/">Clinics</NavItem>
                    <NavItem link="https://id.patientfusion.com/signin">Patient Portal</NavItem>
                    <NavItem onLinkClicked={bookingsClickHandler} link="#">Bookings</NavItem>
                    <NavItem link="/contact/">Contact</NavItem>
                </ul>
            </nav>
        </div>
    )
}

