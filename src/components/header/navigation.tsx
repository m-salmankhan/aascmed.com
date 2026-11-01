import { useEffect, useId, useRef, useState } from "react";
import { css, Global } from "@emotion/react";
import { SiteLink } from "../../navigation/link";
import { stylesScreenReaderText } from "../../styles/accessibility";
import { HorizontalLogo, StackedLogo } from "../logo";
import { FaIcons, IconStyles } from "../font-awesome";
import { bounceTransition, colours } from "../../styles/theme";
import { useSiteMetadata } from "../../hooks/useSiteMetadata";
import { ZocDocURL } from "../zocdoc";

type NavigationLayout = "right" | "centered" | "collapsed";

const links = [
  ["/conditions/", "Patient Education"],
  ["/providers/", "Our Team"],
  ["/clinics/", "Locations"],
  ["/blog/", "Blog"],
  ["https://allercorehealth.com/", "AllerCore Health"],
  ["https://login.patientfusion.com", "Patient Portal"],
  [ZocDocURL, "Bookings"],
  ["/contact/", "Contact"],
];

function NavigationLinks() {
  return <>{links.map(([href, label]) => <li key={href}>
    {href.startsWith("https://")
      ? <a href={href} target="_blank" rel="noreferrer">{label}</a>
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

  nav {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    position: relative;
  }

  [data-layout="right"] {
    flex-direction: row;
    justify-content: space-between;
  }

  [data-logo] {
    display: block;
    flex: 0 0 auto;
    width: 16rem;
    max-width: 100%;

    svg {
      display: block;
      width: 100%;
      fill: #fff;
      transition: transform 1s ${bounceTransition};
    }

    &:focus-within svg, &:active svg { transform: scale(0.8); }
    .horizontal { display: none; height: 5rem; }
    .stacked { height: 10rem; }
  }

  [data-layout="right"] [data-logo] {
    .horizontal { display: block; }
    .stacked { display: none; }
  }

  .js-navigation { min-width: 0; max-width: 100%; }
  [data-layout="collapsed"] .js-navigation { width: 100%; }
  [data-layout="collapsed"] .menu-toggle { display: block; }
  .menu-toggle { display: none; text-align: center; }

  .menu-content {
    display: grid;
    grid-template-rows: 1fr;
  }

  [data-layout="collapsed"] .menu-content {
    transition: grid-template-rows 250ms ease;
    &[data-open="false"] {
      grid-template-rows: 0fr;
      visibility: hidden;
    }
  }

  ul {
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    column-gap: 1rem;
    list-style: none;
    padding: 0;
    margin: 0;
    min-height: 0;
    overflow: hidden;

    li {
      flex: 0 0 auto;
      width: max-content;
      max-width: 100%;
      margin: 0;
      padding: 0;
      font-weight: bold;
      letter-spacing: 0.025rem;
      white-space: nowrap;
    }

    a {
      display: inline-block;
      color: #fff;
      text-decoration: none;
      border-bottom: 5px solid transparent;
      padding: 5px 0;
      &.active { border-bottom-color: #fff; }
      &:focus, &:hover, &:active {
        color: ${colours.infoBlue};
        background: ${colours.infoYellow};
        border-bottom-color: ${colours.infoBlue};
      }
    }
  }

  [data-layout="collapsed"] .js-navigation ul, details ul {
    flex-direction: column;
    align-items: center;
    li { padding-block: 0.5rem; white-space: normal; text-align: center; }
  }

  button, summary {
    width: max-content;
    max-width: 100%;
    margin: 0 auto;
    padding: 0.5rem;
    font-size: 1rem;
    text-transform: uppercase;
    font-weight: bold;
    border: none;
    background: transparent;
    color: #fff;
    cursor: pointer;
    svg {
      width: 1rem;
      height: 1rem;
      fill: currentColor;
      vertical-align: middle;
      margin-right: 0.5rem;
    }
    &:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
  }

  summary { list-style: none; }
  summary::-webkit-details-marker { display: none; }

  .fallback-links { display: none; }
  noscript { display: none; }
  details { width: 100%; }

  /* Conservative CSS fallback: native details works before/without JavaScript.
     Flex wrapping places the full row beside or below the logo when it fits. */
  @container (min-width: 64rem) {
    .fallback-links { display: flex; width: max-content; margin-inline: auto; }
    details { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .menu-content, [data-logo] svg { transition: none !important; }
  }
`;

interface NavigationProps {
  frontPage: boolean;
  className?: string;
}

/** Choose a single-row navigation layout from the actual rendered link widths.
 * Native details and CSS retain navigation when JavaScript is unavailable.
 */
export function Navigation({ frontPage, className }: NavigationProps) {
  const { title } = useSiteMetadata();
  const [layout, setLayout] = useState<NavigationLayout>("collapsed");
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const logoRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const focusAfterLayout = useRef<"toggle" | "link" | null>(null);
  const listId = useId();
  const visible = layout !== "collapsed" || open;

  useEffect(() => {
    const nav = navRef.current;
    const list = listRef.current;
    const logo = logoRef.current;
    if (!nav || !list || !logo) return;

    let previousLayout: NavigationLayout = "collapsed";
    const measure = () => {
      const items = Array.from(list.children);
      // max-content items remain measurable inside the closed menu's zero-height row.
      const linksWidth = items.reduce((total, item) => total + Math.ceil(item.getBoundingClientRect().width), 0)
        + parseFloat(getComputedStyle(list).columnGap) * (items.length - 1);
      const available = nav.getBoundingClientRect().width;
      const rowWidth = linksWidth + logo.getBoundingClientRect().width
        + parseFloat(getComputedStyle(nav).columnGap);
      const next = rowWidth <= available ? "right" : linksWidth <= available ? "centered" : "collapsed";
      if (previousLayout !== next) {
        // Move focus after React has made the new layout visible.
        if (next === "collapsed" && list.contains(document.activeElement)) focusAfterLayout.current = "toggle";
        if (next !== "collapsed" && document.activeElement === toggleRef.current) focusAfterLayout.current = "link";
        previousLayout = next;
        setOpen(false);
        setLayout(next);
      }
    };

    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    observer.observe(logo);
    Array.from(list.children).forEach(item => observer.observe(item));
    measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, []);

  useEffect(() => {
    if (focusAfterLayout.current === "toggle") toggleRef.current?.focus();
    if (focusAfterLayout.current === "link") listRef.current?.querySelector("a")?.focus();
    focusAfterLayout.current = null;
  }, [layout]);

  return <div className={className} css={stylesNavigation}>
    <a css={stylesSkipToMain} href="#main">Skip to main content</a>
    <nav ref={navRef} data-layout={layout} aria-label="Main navigation" onKeyDown={event => {
      if (event.key === "Escape" && layout === "collapsed" && open) {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }}>
      <span ref={logoRef} data-logo><SiteLink href="/">
        <HorizontalLogo className="horizontal" />
        <StackedLogo className="stacked" />
        {frontPage ? <h1 css={stylesScreenReaderText}>{title}</h1> : <span css={stylesScreenReaderText}>{title}</span>}
      </SiteLink></span>
      <div className="js-navigation">
        <div className="menu-toggle">
          <button ref={toggleRef} aria-expanded={visible} aria-controls={listId} onClick={() => setOpen(value => !value)}>
            <FaIcons iconStyle={IconStyles.SOLID} icon="bars" />Menu
          </button>
        </div>
        <div className="menu-content" data-open={open} aria-hidden={!visible}>
          <ul id={listId} ref={listRef}><NavigationLinks /></ul>
        </div>
      </div>
      <noscript>
        <Global styles={css`
          .js-navigation { display: none !important; }
          nav[data-layout] noscript { display: contents; }
          nav[data-layout] { flex-direction: row; flex-wrap: wrap; justify-content: center; }
          @container (min-width: 78rem) {
            nav[data-layout] [data-logo] .horizontal { display: block; }
            nav[data-layout] [data-logo] .stacked { display: none; }
          }
        `} />
        <ul className="fallback-links"><NavigationLinks /></ul>
        <details>
          <summary><FaIcons iconStyle={IconStyles.SOLID} icon="bars" />Menu</summary>
          <ul><NavigationLinks /></ul>
        </details>
      </noscript>
    </nav>
  </div>;
}
