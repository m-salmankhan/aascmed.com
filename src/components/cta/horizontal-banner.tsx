import React from "react";
import { css } from "@emotion/react";
import { Container } from "../containers";
import { PrimaryAnchor, SecondaryAnchor } from "../buttons";
import { colours, gridSpacing } from "../../styles/theme";
import { CalloutBanner } from "./banner";

interface HorizontalCalloutBannerProps {
  className?: string;
  title: string;
  description: string;
  primaryButtonLabel: string;
  primaryButtonUrl: string;
  secondaryButtonLabel: string;
  secondaryButtonUrl: string;
  useContainer?: boolean;
  compactInContainer?: boolean;
}

const stylesSection = css({
  marginTop: `${gridSpacing * 2}em`,
});

const stylesSectionCompact = css({
  marginTop: 0,
});

const stylesCompactInContainer = css({
  margin: `${gridSpacing}em 0 0`,
  paddingLeft: `${gridSpacing / 2}em`,
  paddingRight: `${gridSpacing / 2}em`,
});

const stylesSecondaryOnDark = css({
  backgroundColor: "transparent",
  color: colours.bodyBackground,
  borderColor: colours.bodyBackground,

  "&:hover, &:focus": {
    backgroundColor: colours.bodyBackground,
    color: colours.brandPrimary,
    borderColor: colours.bodyBackground,
  },
});

export const HorizontalCalloutBanner: React.FC<HorizontalCalloutBannerProps> = ({
  className,
  title,
  description,
  primaryButtonLabel,
  primaryButtonUrl,
  secondaryButtonLabel,
  secondaryButtonUrl,
  useContainer = true,
  compactInContainer = false,
}) => {
  const banner = (
    <CalloutBanner
      title={title}
      description={description}
      variant="dark"
      layout="horizontal"
      titleSize="compact"
      css={compactInContainer ? stylesCompactInContainer : undefined}
    >
      <PrimaryAnchor
        href={primaryButtonUrl}
        target={"_blank"}
        rel={"noopener noreferrer"}
      >
        {primaryButtonLabel}
      </PrimaryAnchor>
      <SecondaryAnchor
        href={secondaryButtonUrl}
        target={"_blank"}
        rel={"noopener noreferrer"}
        css={stylesSecondaryOnDark}
      >
        {secondaryButtonLabel}
      </SecondaryAnchor>
    </CalloutBanner>
  );

  return (
    <section
      className={className}
      css={[stylesSection, compactInContainer && stylesSectionCompact]}
      aria-label={"Call to action"}
    >
      {useContainer ? <Container>{banner}</Container> : banner}
    </section>
  );
};
