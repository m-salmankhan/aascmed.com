import { useEffect } from "react";
import type { RefObject } from "react";

/** Enhance the native menu with its original slide transition and keyboard focus.
 * CSS still selects the layout before hydration; no-JS and pre-hydration toggles
 * retain native details behaviour. Only user interactions start an animation.
 */
export function useAnimatedNavigation(
  navRef: RefObject<HTMLElement | null>,
  detailsRef: RefObject<HTMLDetailsElement | null>,
  desktopRef: RefObject<HTMLUListElement | null>,
) {
  useEffect(() => {
    const nav = navRef.current;
    const details = detailsRef.current;
    const desktop = desktopRef.current;
    const summary = details?.querySelector("summary");
    const content = details?.querySelector<HTMLElement>(".mobile-menu-content");
    if (!nav || !details || !desktop || !summary || !content) return;

    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    let mobile = getComputedStyle(details).display !== "none";
    let desiredOpen = details.open;
    let transition: Animation | undefined;
    let generation = 0;
    let disposed = false;
    let focused = nav.contains(document.activeElement) ? document.activeElement : null;

    const settle = (open: boolean) => {
      generation++;
      transition?.cancel();
      transition = undefined;
      desiredOpen = open;
      details.open = open;
      content.inert = false;
      delete content.dataset.animating;
      content.style.removeProperty("max-height");
      content.style.removeProperty("transition");
      summary.removeAttribute("aria-expanded");
    };

    const setOpen = (open: boolean, immediate = false) => {
      desiredOpen = open;
      if (immediate || !mobile || reducedMotion.matches) {
        settle(open);
        return;
      }
      const ticket = ++generation;
      // Preserve the original 60em transition range, extending it if enlarged
      // content needs more room. A fully expanded menu has no height limit.
      details.open = true;
      const expandedHeight = Math.max(60 * parseFloat(getComputedStyle(content).fontSize), content.scrollHeight);
      if (!transition) {
        content.style.transition = "none";
        content.style.maxHeight = open ? "0px" : `${expandedHeight}px`;
        content.getBoundingClientRect();
        content.style.removeProperty("transition");
      }
      content.dataset.animating = "";
      content.inert = !open;
      summary.setAttribute("aria-expanded", String(open));
      content.style.maxHeight = open ? `${expandedHeight}px` : "0px";
      // Let CSS handle interrupted/reversed transitions, including its native
      // reversal timing. Waiting on this element ignores bubbled child events.
      transition = content.getAnimations().find(animation =>
        "transitionProperty" in animation && animation.transitionProperty === "max-height");
      if (!transition) {
        settle(open);
        return;
      }
      transition.finished.then(
        () => { if (!disposed && generation === ticket) settle(open); },
        () => { if (!disposed && generation === ticket) settle(desiredOpen); },
      );
    };

    const toggle = (event: MouseEvent) => {
      if (!mobile || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(!(transition ? desiredOpen : details.open));
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !mobile || !(transition ? desiredOpen : details.open)) return;
      event.preventDefault();
      setOpen(false);
      summary.focus();
    };
    const rememberFocus = (event: FocusEvent) => {
      focused = event.target instanceof Element && nav.contains(event.target) ? event.target : null;
    };
    const forgetOrdinaryBlur = (event: FocusEvent) => {
      // A layout switch can hide the focused link before ResizeObserver runs.
      // Retain only that hidden target; an ordinary blur means the user left it.
      if (event.target instanceof Element && event.target.getClientRects().length) focused = null;
    };
    const motionChanged = () => { if (reducedMotion.matches) settle(desiredOpen); };

    // A native menu may have been opened on mobile and resized before hydration.
    // Preserve that interaction only when CSS still selects the mobile layout.
    if (!mobile) settle(false);
    const observer = new ResizeObserver(() => {
      const nextMobile = getComputedStyle(details).display !== "none";
      if (nextMobile === mobile) return;
      mobile = nextMobile;
      if (nextMobile) {
        if (desktop.contains(focused)) summary.focus();
      } else {
        const restoreFocus = details.contains(focused);
        setOpen(false, true);
        if (restoreFocus) desktop.querySelector("a")?.focus();
      }
    });
    observer.observe(nav);
    summary.addEventListener("click", toggle);
    details.addEventListener("keydown", escape);
    nav.addEventListener("focusout", forgetOrdinaryBlur);
    document.addEventListener("focusin", rememberFocus);
    reducedMotion.addEventListener("change", motionChanged);
    return () => {
      disposed = true;
      settle(desiredOpen);
      observer.disconnect();
      summary.removeEventListener("click", toggle);
      details.removeEventListener("keydown", escape);
      nav.removeEventListener("focusout", forgetOrdinaryBlur);
      document.removeEventListener("focusin", rememberFocus);
      reducedMotion.removeEventListener("change", motionChanged);
    };
  }, [navRef, detailsRef, desktopRef]);
}
