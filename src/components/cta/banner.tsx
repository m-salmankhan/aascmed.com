import React, { ReactNode } from "react";
import { css } from "@emotion/react";
import { colours, gridSpacing } from "../../styles/theme";
import { stylesBigH1, stylesH2 } from "../headings";
import { breakpointStrings } from "../../styles/breakpoints";

interface CalloutBannerProps {
  className?: string;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  centered?: boolean;
  variant?: "dark" | "light";
  layout?: "block" | "horizontal";
  titleSize?: "default" | "compact";
}

const stylesBase = css({
  margin: `${gridSpacing * 2}em 0`,
  padding: `${gridSpacing}em`,
});

const stylesDark = css(stylesBase, {
  background: colours.brandPrimary,
  color: colours.bodyBackground,

  "a, button": {
    borderColor: colours.bodyBackground,
  },
});

const stylesLight = css(stylesBase, {
  background: "transparent",
  color: "inherit",
});

const stylesCentered = css({
  textAlign: "center",
});

const stylesHorizontal = css({
  display: "flex",
  flexDirection: "column",
  gap: `${gridSpacing}em`,
  alignItems: "flex-start",

  [breakpointStrings.md]: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});

const stylesContentSection = css({
  flex: 1,
});

const stylesButtonsSection = css({
  display: "flex",
  flexDirection: "column",
  gap: `${gridSpacing / 2}em`,
  width: "100%",

  [breakpointStrings.sm]: {
    flexDirection: "row",
    width: "auto",
  },
});

const stylesTitleDark = css(stylesBigH1, {
  "&&": {
    marginTop: 0,
    color: colours.bodyBackground,
  },
});

const stylesTitleLight = css(stylesBigH1, {
  "&&": {
    marginTop: 0,
    color: colours.brandPrimary,
  },
});

const stylesTitleDarkCompact = css(stylesH2, {
  "&&": {
    marginTop: 0,
    marginBottom: `${gridSpacing / 4}em`,
    color: colours.bodyBackground,
  },
});

const stylesTitleLightCompact = css(stylesH2, {
  "&&": {
    marginTop: 0,
    marginBottom: `${gridSpacing / 4}em`,
    color: colours.brandPrimary,
  },
});

const stylesDescription = css({
  marginTop: 0,
  marginBottom: `${gridSpacing / 2}em`,
});

export const CalloutBanner: React.FC<CalloutBannerProps> = ({
  className,
  title,
  description,
  children,
  centered = false,
  variant = "dark",
  layout = "block",
  titleSize = "default",
}) => {
  const bannerStyle = variant === "dark" ? stylesDark : stylesLight;
  const titleStyle =
    titleSize === "compact"
      ? (variant === "dark" ? stylesTitleDarkCompact : stylesTitleLightCompact)
      : (variant === "dark" ? stylesTitleDark : stylesTitleLight);

  if (layout === "horizontal") {
    return (
      <aside className={className} css={[bannerStyle, stylesHorizontal]}>
        <div css={stylesContentSection}>
          <h2 css={titleStyle}>{title}</h2>
          {description && <p css={stylesDescription}>{description}</p>}
        </div>
        <nav css={stylesButtonsSection}>
          {children}
        </nav>
      </aside>
    );
  }

  return (
    <aside className={className} css={[bannerStyle, centered && stylesCentered]}>
      <h2 css={titleStyle}>{title}</h2>
      {description && <p css={stylesDescription}>{description}</p>}
      {children}
    </aside>
  );
};
