import React, { ComponentProps, useEffect, useState } from "react";
import { normalizePath, useCurrentPath } from "./current-path";

/** Browser anchor props plus route-aware active-state options. */
type SiteLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  /** Add the class when this link points at the current document path. */
  activeClassName?: string;
  /** Match child paths as well as an exact path. */
  partiallyActive?: boolean;
};

/** Render a browser anchor with optional exact or child-route active styling.
 * @param props Anchor attributes, destination, active class, and matching options.
 * @returns An anchor with `aria-current="page"` on exact path matches.
 */
export const SiteLink: React.FC<SiteLinkProps> = ({
  href,
  activeClassName,
  partiallyActive = false,
  className,
  children,
  ...props
}) => {
  const providedPath = useCurrentPath();
  const [browserPath, setBrowserPath] = useState<string | null>(null);
  const currentPath = providedPath ?? browserPath;
  const internalPath = href.startsWith("/") && !href.startsWith("//") ? href.split(/[?#]/, 1)[0] : null;
  const exactActive = !!internalPath && currentPath !== null && normalizePath(internalPath) === currentPath;
  const partialActive = !!internalPath && partiallyActive && currentPath !== null &&
    currentPath.startsWith(normalizePath(internalPath));
  const active = exactActive || partialActive;
  const classes = [className, active && activeClassName].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    if (providedPath === null) setBrowserPath(normalizePath(window.location.pathname));
  }, [activeClassName, providedPath]);

  return (
    <a
      {...props}
      href={href}
      className={classes}
      aria-current={exactActive ? "page" : props["aria-current"]}
    >
      {children}
    </a>
  );
};
