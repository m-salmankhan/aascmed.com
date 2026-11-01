import { useEffect, useRef } from "react";
import { css } from "@emotion/react";
import { SiteLink } from "../../navigation/link";
import { stylesScreenReaderText } from "../../styles/accessibility";
import { HorizontalLogo, StackedLogo } from "../logo";
import { FaIcons, IconStyles } from "../font-awesome";
import { colours } from "../../styles/theme";
import { useSiteMetadata } from "../../hooks/useSiteMetadata";
import { navigationItems, navigationSizing } from "./navigation-config.mts";
import { navigationRowWidthRem, navigationRightWidthRem, navigationItemWidthsRem } from "./generated-navigation-metrics.mts";

function NavigationLinks() {
  return <>{navigationItems.map(({ href, label }, index) => <li key={href} style={{ width: `${navigationItemWidthsRem[index]}rem` }}>
    {href.startsWith("https://")
      ? <a href={href} target="_BLANK" rel="noreferrer">{label}</a>
      : <SiteLink href={href} activeClassName="active">{label}</SiteLink>}
  </li>)}</>;
}

const stylesSkipToMain = css(stylesScreenReaderText, css`
  &:focus {
    clip-path: none;
    height: auto;
    width: auto;
    margin: 0;
    padding: 1rem;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 2;
    background: #fff;
    color: ${colours.brandPrimary};
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
    svg { width: ${navigationSizing.logoWidth}rem; max-width: 100%; fill: #fff; }
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
      font-weight: 800;
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
      &.active { border-bottom-color: #fff; }
      &:focus, &:hover, &:active {
        color: ${colours.infoBlue};
        background: ${colours.infoYellow};
        border-bottom-color: ${colours.infoBlue};
      }
    }
  }

  .desktop-links { display: none; }
  .mobile-menu { width: 100%; }
  .mobile-menu ul { flex-direction: column; margin-top: 0.5rem; text-align: center; }
  summary {
    list-style: none;
    cursor: pointer;
    width: max-content;
    margin-inline: auto;
    padding: 0.5rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #fff;
    svg { width: 1rem; height: 1rem; fill: currentColor; vertical-align: middle; margin-right: 0.5rem; }
    &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  }
  summary::-webkit-details-marker { display: none; }

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
 * JavaScript only restores keyboard focus and resets an open menu across resize.
 */
export function Navigation({ frontPage, className }: NavigationProps) {
  const { title } = useSiteMetadata();
  const navRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const desktopRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const details = detailsRef.current;
    const desktop = desktopRef.current;
    if (!nav || !details || !desktop) return;
    let mobile = getComputedStyle(details).display !== "none";
    // CSS can hide a focused control before ResizeObserver runs and the browser
    // then reports body as active. Remember focus so it can move to a visible link.
    let focused = nav.contains(document.activeElement) ? document.activeElement : null;
    const rememberFocus = (event: FocusEvent) => {
      focused = event.target instanceof Element && nav.contains(event.target) ? event.target : null;
    };
    document.addEventListener("focusin", rememberFocus);
    const observer = new ResizeObserver(() => {
      const nextMobile = getComputedStyle(details).display !== "none";
      if (nextMobile === mobile) return;
      if (nextMobile && desktop.contains(focused)) details.querySelector("summary")?.focus();
      if (!nextMobile) {
        if (details.contains(focused)) desktop.querySelector("a")?.focus();
        details.open = false;
      }
      mobile = nextMobile;
    });
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", rememberFocus);
    };
  }, []);

  return <div css={stylesNavigation} className={className}>
    <a css={stylesSkipToMain} href="#main">Skip to main content</a>
    <nav ref={navRef} aria-label="Main navigation">
      <div className="brand"><SiteLink href="/">
        <HorizontalLogo className="horizontal" />
        <StackedLogo className="stacked" />
        {frontPage ? <h1 css={stylesScreenReaderText}>{title}</h1> : <span css={stylesScreenReaderText}>{title}</span>}
      </SiteLink></div>
      <ul ref={desktopRef} className="desktop-links"><NavigationLinks /></ul>
      <details ref={detailsRef} className="mobile-menu" suppressHydrationWarning onKeyDown={event => {
        if (event.key === "Escape") {
          event.currentTarget.open = false;
          event.currentTarget.querySelector("summary")?.focus();
        }
      }}>
        <summary><FaIcons iconStyle={IconStyles.SOLID} icon="bars" />Menu</summary>
        <ul><NavigationLinks /></ul>
      </details>
    </nav>
  </div>;
}
