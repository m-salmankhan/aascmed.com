import React from "react";
import { Navigation } from "./navigation";
import { HeroBase } from "./hero-base";
import { css } from "@emotion/react";

export type HeroProps = React.ComponentProps<typeof HeroBase>;

/** Gatsby adapter. Astro can use HeroBase and supply navigation without importing Gatsby routing. */
export const Hero: React.FC<HeroProps> = (props) =>
  <HeroBase {...props} navigation={<Navigation css={css({ position: "relative", zIndex: 1 })} frontPage={true} />} />;
