import React, { ComponentProps, MouseEventHandler, useEffect, useId, useRef, useState } from "react";
import { css } from "@emotion/react";
import { Link } from "gatsby";
import { stylesScreenReaderText } from "../../styles/accessibility";
import { HorizontalLogo, StackedLogo } from "../logo";
import { FaIcons, IconStyles } from "../font-awesome";
import { bounceTransition, colours, gridSpacing } from "../../styles/theme";
import { CSSInterpolation } from "@emotion/serialize";
import { breakpointStrings, mediaBreakpoints } from "../../styles/breakpoints";
import { cols, gridContainer } from "../../styles/grid";
import { useSiteMetadata } from "../../hooks/useSiteMetadata";
import { ZocDocURL } from "../zocdoc";

type NavItemProps = ComponentProps<"li"> & {
  link: string,
  onLinkClicked?: MouseEventHandler<HTMLAnchorElement>,
};
const NavItem: React.FC<NavItemProps> = ({ link, onLinkClicked, children, ...props }) =>
  <li {...props}>
    {
      (link.startsWith(`https://`)) ?
        <a href={link} target="_BLANK" rel="noreferrer">{children}</a> :
        <Link to={link} activeClassName={"active"}>{children}</Link>
    }
  </li>


enum NavigationMenuStates {
  EXPANDED = "expanding",
  PRE_COLLAPSING = "pre-collapsing",
  COLLAPSING = "collapsing",
  COLLAPSED = "collapsed",
  PRE_EXPANDING = "pre-expanding",
  EXPANDING = "expanding",
}

const stylesSkipToMain = css(stylesScreenReaderText, css`
  display: block;
  background-color: #fff;
  color: ${colours.brandPrimary};
  box-shadow: 0 0 1rem rgba(0, 0, 0, 0.5);
  border: 1px solid ${colours.brandPrimary};
  font-weight: bold;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;

  &:focus {
    border: 0;
    clip-path: none;
    height: auto;
    margin: 0;
    overflow: visible;
    padding: 1rem;
    position: absolute;
    top: 0;
    left: 0;
    width: auto;
    word-wrap: normal;
    outline: none;
  }
`);

const stylesNav = css(
  gridContainer(mediaBreakpoints.lg),
  css`
      justify-content: space-between;
      align-items: center;
    `
);

const stylesToggleButton = css`
  text-align: center;

  ${breakpointStrings.md} {
    display: none;
  }

  button {
    font-size: 1rem;
    text-transform: uppercase;
    font-weight: bold;
    border: none;
    outline: none;
    background: none;
    color: white;
    margin: 1rem auto;
    cursor: pointer;
    padding: 0.5rem;

    svg {
      width: 1rem;
      height: 1rem;
      fill: #fff;
      vertical-align: middle;
      margin-right: 0.5rem;
      transition: transform 0.5s ease-in-out 0s;
    }

    &:focus {
      background: #fff;
      color: ${colours.brandPrimary};

      svg {
        fill: ${colours.brandPrimary};
        transform: rotate(180deg);
      }
    }
  }
`;


const stylesLogoLink = css(
  cols(3, mediaBreakpoints.lg),
  css`
      svg {
        width: 100%;
        fill: #fff;
        transition: transform 1s ${bounceTransition} 0s;
      }
    ;

      &:focus, &:active {
        svg {
          transform: scale(0.8);
        }
      }

      @media screen and (min-width: 0) {
        padding-left: 0;
      }
    `
);

// only show one logo at a time
const stylesHorizontalLogo: CSSInterpolation = css`
  display: none;

  ${breakpointStrings.lg} {
    display: block;
    height: 5em;
  }
`;

const stylesStackedLogo = css`
  margin: 0 auto ${gridSpacing}em;
  display: block;

  ${breakpointStrings.lg} {
    display: none;
  }
`;

const expandedHeight = "60em";

const stylesNavigationUl = css(
  cols(9, mediaBreakpoints.lg),
  css`
      padding: 0;
      margin: 0 auto;
      text-align: center;
      list-style: none;
      overflow: hidden;
      transition: max-height 1s ease-in-out 0s;

      li {
        font-weight: bold;
        display: block;
        letter-spacing: 0.025rem;
        padding: ${gridSpacing / 4}em 0;
      }

      a, button {
        display: inline-block;
        color: #fff;
        text-decoration: none;
        background: transparent;
        border: none;
        border-bottom: 5px solid transparent;
        vertical-align: middle;
        padding: 5px 0;

        &.active, &.active:hover {
          border-bottom: 5px solid white;
        }

        &:focus, &:hover, &:active {
          outline: none;
          border: none;
          color: ${colours.infoBlue};
          background: ${colours.infoYellow};
          border-bottom: 5px solid ${colours.infoBlue};
          text-decoration: none;
        }
      }

      ${breakpointStrings.md} {
        margin: 0;

        li {
          display: inline-block;
          padding: 0 ${gridSpacing / 2}em;

          &:first-of-type {
            padding-left: 0;
          }

          &:last-of-type {
            padding-right: 0;
          }
        }
      }

      ${breakpointStrings.lg} {
        text-align: right;
        padding-right: 0;
      }

      // Reset max-height so all content is visible
      &.${NavigationMenuStates.EXPANDED} {
        max-height: initial;
      }

      // Reset max-height so all content is visible
      &.${NavigationMenuStates.PRE_COLLAPSING} {
        max-height: ${expandedHeight};
      }

      // Change max-height to animate collapse
      &.${NavigationMenuStates.COLLAPSING} {
        max-height: 0;
      }

      // Hide from screen readers when animation complete
      &.${NavigationMenuStates.COLLAPSED} {
        display: none;
        // Don't hide if screen size large
        ${breakpointStrings.md} {
          display: block;
        }
      }

      // Add max-height 0 again so that the transition can occur
      &.${NavigationMenuStates.PRE_EXPANDING} {
        max-height: 0;

        // Don't change max-height on big screens
        // This isn't really needed though; it will never be that big on horizontal layout
        ${breakpointStrings.md} {
          max-height: initial;
        }
      }

      // Change max-height to animate expansion
      &.${NavigationMenuStates.EXPANDING} {
        max-height: ${expandedHeight};

        // Don't change max-height on big screens
        // This isn't really needed though; it will never be that big on horizontal layout
        ${breakpointStrings.md} {
          max-height: initial;
        }
      }
    `
);

interface NavigationProps {
  frontPage: boolean,
  className?: string,
}

export const Navigation: React.FC<NavigationProps> = ({ frontPage, className }) => {
  const { title } = useSiteMetadata();
  const [collapsedState, setCollapsedState] = useState(NavigationMenuStates.EXPANDED);
  const listId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);
  const [jsEnabled, setJSEnabled] = useState(false);

  // set JSEnabled to true
  useEffect(() => {
    setJSEnabled(true);
    if (!matchMedia(`
    screen
    and(min - width
: ${mediaBreakpoints.md}
    em
)
    `).matches) {
      setCollapsedState(NavigationMenuStates.COLLAPSED);
    }
  }, [setJSEnabled]);

  // progress the state after adding necessary styles for transition to occur
  // These do not result in a transition event so the state must be forwarded here
  useEffect(() => {
    if (collapsedState === NavigationMenuStates.PRE_EXPANDING) {
      setCollapsedState(NavigationMenuStates.EXPANDING);
      return;
    }

    if (collapsedState === NavigationMenuStates.PRE_COLLAPSING) {
      setCollapsedState(NavigationMenuStates.COLLAPSING);
      return;
    }
  }, [collapsedState, setCollapsedState]);

  const transitionEndHandler = () => {
    switch (collapsedState) {
      // This doesn't case a transition so there is no handler
      case NavigationMenuStates.COLLAPSED:
        break

      // This doesn't case a transition so there is no handler
      case NavigationMenuStates.EXPANDED:
        break

      // This doesn't case a transition so there is no handler
      case NavigationMenuStates.PRE_EXPANDING:
        break

      // This doesn't case a transition so there is no handler
      case NavigationMenuStates.PRE_COLLAPSING:
        break

      case NavigationMenuStates.EXPANDING:
        setCollapsedState(NavigationMenuStates.EXPANDED);
        break

      case NavigationMenuStates.COLLAPSING:
        setCollapsedState(NavigationMenuStates.COLLAPSED);
        break
    }
  };

  const toggleMenu = () => {
    switch (collapsedState) {
      case NavigationMenuStates.EXPANDED:
        setCollapsedState(NavigationMenuStates.PRE_COLLAPSING);
        break

      // temporary state; changed immediately in useEffect()
      case NavigationMenuStates.PRE_COLLAPSING:
        break

      case NavigationMenuStates.COLLAPSING:
        setCollapsedState(NavigationMenuStates.EXPANDING);
        break

      case NavigationMenuStates.COLLAPSED:
        setCollapsedState(NavigationMenuStates.PRE_EXPANDING);
        break

      // temporary state; changed immediately in useEffect()
      case NavigationMenuStates.PRE_EXPANDING:
        break

      case NavigationMenuStates.EXPANDING:
        setCollapsedState(NavigationMenuStates.COLLAPSING);
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
            <h1 css={stylesScreenReaderText}>{title}</h1> :
            <span css={stylesScreenReaderText}>{title}</span>
          }
        </Link>

        {/* Toggle Button (show only if JS enabled) */}
        {
          jsEnabled ?
            <div css={css(stylesToggleButton)}>
              <button aria-expanded={collapsedState !== NavigationMenuStates.COLLAPSED}
                onClick={toggleMenu} aria-controls={listId}>
                <FaIcons iconStyle={IconStyles.SOLID} icon="bars" />
                Menu
              </button>
            </div> : <></>
        }

        <ul className={collapsedState} id={listId} ref={listRef} css={stylesNavigationUl}
          onTransitionEnd={transitionEndHandler}
          aria-hidden={collapsedState === NavigationMenuStates.COLLAPSED}>
          <NavItem link="/conditions/">Patient Education</NavItem>
          <NavItem link="/providers/">Our Team</NavItem>
          <NavItem link="/clinics/">Locations</NavItem>
          <NavItem link="https://login.patientfusion.com">Patient Portal</NavItem>
          <NavItem link={ZocDocURL}>Bookings</NavItem>
          <NavItem link="/contact/">Contact</NavItem>
        </ul>
      </nav>
    </div>
  )
}

