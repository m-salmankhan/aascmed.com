import React from "react";
import { css } from "@emotion/react";
import { Container } from "../containers";
import { PrimaryAnchor, SecondaryAnchor } from "../buttons";
import { gridSpacing } from "../../styles/theme";
import { breakpointStrings } from "../../styles/breakpoints";
import { CalloutBanner } from "../cta/banner";

interface PatientFormsBannerProps {
  className?: string;
  heading?: string;
  description?: string;
  registrationFormUrl: string;
  healthHistoryFormUrl: string;
}

const stylesSection = css({
  marginTop: `${gridSpacing * 2}em`,
});

const stylesButtonRow = css({
  display: "flex",
  flexDirection: "column",
  gap: `${gridSpacing / 2}em`,
  alignItems: "center",
  marginTop: `${gridSpacing}em`,

  [breakpointStrings.sm]: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
  },
});

export const PatientFormsBanner: React.FC<PatientFormsBannerProps> = ({
  className,
  heading = "New Patient? Start Here",
  description = "Complete your paperwork online before your visit - quick, secure, and paperless.",
  registrationFormUrl,
  healthHistoryFormUrl,
}) => (
  <section className={className} css={stylesSection} aria-label={"Patient forms"}>
    <Container>
      <CalloutBanner title={heading} description={description} centered={true} variant="dark">
        <nav css={stylesButtonRow} aria-label={"Patient forms links"}>
          <PrimaryAnchor
            href={registrationFormUrl}
            target={"_blank"}
            rel={"noopener noreferrer"}
          >
            Patient Registration Form
          </PrimaryAnchor>
          <SecondaryAnchor
            href={healthHistoryFormUrl}
            target={"_blank"}
            rel={"noopener noreferrer"}
          >
            Patient Health History Form
          </SecondaryAnchor>
        </nav>
      </CalloutBanner>
    </Container>
  </section>
);
