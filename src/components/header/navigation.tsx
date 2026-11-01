import { useRef } from "react";
import { css } from "@emotion/react";
import { SiteLink } from "../../navigation/link";
import { stylesScreenReaderText } from "../../styles/accessibility";
import { HorizontalLogo, StackedLogo } from "../logo";
import { FaIcons, IconStyles } from "../font-awesome";
import { bounceTransition, colours, gridSpacing } from "../../styles/theme";
import { useAnimatedNavigation } from "./use-animated-navigation";
import { useSiteMetadata } from "../../hooks/useSiteMetadata";
import { navigationItems, navigationSizing, navigationToggle } from "./navigation-config.mts";
import { navigationRowWidthRem, navigationRightWidthRem, navigationItemWidthsRem, navigationToggleWidthRem } from "./generated-navigation-metrics.mts";

function NavigationLinks({ measured = false }: { measured?: boolean }) {
  return <>{navigationItems.map(({ href, label }, index) => <li key={href} style={measured ? { width: `${navigationItemWidthsRem[index]}rem` } : undefined}>
    {href.startsWith("https://")
      ? <a href={href} target="_BLANK" rel="noreferrer">{label}</a>
      : <SiteLink href={href} activeClassName="active">{label}</SiteLink>}
  </li>)}</>;
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

const stylesNavigation = css`
  container-type: inline-size;
  &, & * { font-family: "AASC Navigation", Poppins, sans-serif; }
  font-size: ${navigationSizing.fontSize}rem;
  line-height: 1.5;
  /* Match the unhinted font advances measured at build time at any root size. */
  text-rendering: geometricPrecision;

  nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: ${navigationSizing.headerGap}rem;
  }

  .brand {
    flex: 0 0 ${navigationSizing.logoWidth}rem;
    max-width: 100%;
    margin-inline: auto;
    text-align: center;
    svg { width: ${navigationSizing.logoWidth}rem; max-width: 100%; fill: #fff; transition: transform 1s ${bounceTransition}; }
    a:focus svg, a:active svg { transform: scale(0.8); }
    .stacked { display: block; height: 10rem; margin-inline: auto; }
    .horizontal { display: none; height: 5rem; }
    a:focus-visible { outline: 2px solid #fff; outline-offset: 4px; }
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.5rem ${navigationSizing.linkGap}rem;
    list-style: none;
    padding: 0;
    margin: 0;
    li {
      flex: 0 0 auto;
      width: max-content;
      max-width: 100%;
      margin: 0;
      font-weight: bold;
      letter-spacing: ${navigationSizing.letterSpacing}rem;
      overflow-wrap: anywhere;
    }
    a {
      display: inline-block;
      width: 100%;
      text-align: center;
      padding-block: 0.3125rem;
      border-bottom: 0.3125rem solid transparent;
      color: #fff;
      text-decoration: none;
      &.active, &.active:hover { border-bottom-color: #fff; }
      &:focus, &:hover, &:active {
        outline: none;
        color: ${colours.infoBlue};
        background: ${colours.infoYellow};
        border-bottom-color: ${colours.infoBlue};
      }
    }
  }

  .desktop-links { display: none; }
  .mobile-menu { width: 100%; line-height: 1.5625; }
  .mobile-menu-content {
    transition: max-height 1s ease-in-out;
    &[data-animating] { overflow: hidden; }
  }
  .mobile-menu ul { display: flow-root; margin: 0; text-align: center; }
  .mobile-menu li {
    display: flex;
    justify-content: center;
    width: auto;
    margin: ${gridSpacing / 3}em 0;
    padding: ${gridSpacing / 4}em 0;
  }
  .mobile-menu a { width: auto; min-width: 0; max-width: 100%; vertical-align: middle; }
  summary {
    list-style: none;
    cursor: pointer;
    width: ${navigationToggleWidthRem}rem;
    max-width: 100%;
    white-space: nowrap;
    margin: 1rem auto;
    padding: ${navigationToggle.padding}rem;
    font-weight: bold;
    text-transform: uppercase;
    color: #fff;
    svg { width: ${navigationToggle.iconWidth}rem; height: ${navigationToggle.iconWidth}rem; fill: currentColor; vertical-align: middle; margin-right: ${navigationToggle.iconGap}rem; transition: transform 0.5s ease-in-out; }
    &:focus {
      background: #fff;
      color: ${colours.brandPrimary};
      svg { transform: rotate(180deg); }
    }
    &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  }
  summary::-webkit-details-marker { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .brand svg, summary svg, .mobile-menu-content { transition: none; }
  }

  /* Both sides of this boundary use the same generated width. No hydration
     state or font-load handler can choose a different initial layout. */
  @container (min-width: ${navigationRowWidthRem}rem) {
    .desktop-links {
      display: flex;
      flex: 0 0 auto;
      width: ${navigationRowWidthRem}rem;
      max-width: 100%;
      margin-inline: auto;
    }
    .mobile-menu { display: none; }
  }

  /* Keep spare space between the tight logo and menu wrappers. When the row
     cannot fit, their auto margins center each wrapper on its own flex line. */
  @container (min-width: ${navigationRightWidthRem}rem) {
    nav { justify-content: space-between; }
    .brand, .desktop-links { margin-inline: 0; }
    .brand {
      .stacked { display: none; }
      .horizontal { display: inline-block; vertical-align: middle; }
    }
  }
`;

interface NavigationProps {
  frontPage: boolean;
  className?: string;
}

/** Render CSS-first navigation with a generated content-width query and native menu.
 * JavaScript preserves the original menu animation and manages keyboard focus.
 */
export function Navigation({ frontPage, className }: NavigationProps) {
  const { title } = useSiteMetadata();
  const navRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const desktopRef = useRef<HTMLUListElement>(null);

  useAnimatedNavigation(navRef, detailsRef, desktopRef);

  return <div css={stylesNavigation} className={className}>
    <a css={stylesSkipToMain} href="#main">Skip to main content</a>
    <nav ref={navRef} aria-label="Main navigation">
      <div className="brand"><SiteLink href="/">
        <HorizontalLogo className="horizontal" />
        <StackedLogo className="stacked" />
        {frontPage ? <h1 css={stylesScreenReaderText}>{title}</h1> : <span css={stylesScreenReaderText}>{title}</span>}
      </SiteLink></div>
      <ul ref={desktopRef} className="desktop-links"><NavigationLinks measured /></ul>
      <details ref={detailsRef} className="mobile-menu" suppressHydrationWarning>
        <summary><FaIcons iconStyle={IconStyles.SOLID} icon="bars" />{navigationToggle.label}</summary>
        <div className="mobile-menu-content"><ul><NavigationLinks /></ul></div>
      </details>
    </nav>
  </div>;
}
