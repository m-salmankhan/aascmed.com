import React, { ComponentProps, useEffect, useState } from "react";

type SiteLinkProps = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  /** Add the class when this link points at the current document path. */
  activeClassName?: string;
  /** Match child paths as well as an exact path. */
  partiallyActive?: boolean;
};

function normalizedPath(path: string): string {
  if (path === "/") return path;
  return `/${path.replace(/^\/+|\/+$/g, "")}/`;
}

/** A framework-neutral link. It deliberately uses normal browser navigation. */
export const SiteLink: React.FC<SiteLinkProps> = ({
  href,
  activeClassName,
  partiallyActive = false,
  className,
  children,
  ...props
}) => {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const internalPath = href.startsWith("/") && !href.startsWith("//") ? href.split(/[?#]/, 1)[0] : null;
  const exactActive = !!internalPath && currentPath !== null && normalizedPath(internalPath) === currentPath;
  const partialActive = !!internalPath && partiallyActive && currentPath !== null &&
    currentPath.startsWith(normalizedPath(internalPath));
  const active = exactActive || partialActive;
  const classes = [className, active && activeClassName].filter(Boolean).join(" ") || undefined;

  useEffect(() => {
    if (activeClassName) setCurrentPath(normalizedPath(window.location.pathname));
  }, [activeClassName]);

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
