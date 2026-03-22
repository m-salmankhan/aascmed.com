import React from "react";
import { css } from "@emotion/react";
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image";
import { CarouselProvider, Slide, Slider, ButtonBack, ButtonNext } from "pure-react-carousel";
import "pure-react-carousel/dist/react-carousel.es.css";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints, breakpointStrings } from "../../styles/breakpoints";
import { colours } from "../../styles/theme";
import { FaIcons, IconStyles } from "../font-awesome";
import { stylesScreenReaderText } from "../../styles/accessibility";

export interface SectionMediaItem {
  mime?: string | null;
  name?: string | null;
  url?: string | null;
  localFile?: {
    childImageSharp?: {
      gatsbyImageData?: IGatsbyImageData;
    } | null;
    publicURL?: string | null;
  } | null;
}

/** Filter to only valid image/video items */
export const filterValidMedia = (media?: SectionMediaItem[] | null): SectionMediaItem[] => {
  if (!media) return [];
  return media.filter(
    (m) => m.mime?.startsWith("image/") || m.mime?.startsWith("video/")
  );
};

const stylesMediaContainer = css({
  width: "100%",
  borderRadius: "8px",
  overflow: "hidden",

  img: {
    borderRadius: "8px",
  },

  video: {
    width: "100%",
    borderRadius: "8px",
  },
});

const stylesCarouselNav = css({
  display: "flex",
  justifyContent: "center",
  gap: "1em",
  marginTop: "0.5em",

  button: {
    background: "transparent",
    border: `2px solid ${colours.brandPrimary}`,
    borderRadius: "50%",
    width: "2.5em",
    height: "2.5em",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "background 0.2s ease",

    svg: {
      width: "1em",
      height: "1em",
      fill: colours.brandPrimary,
    },

    "&:hover, &:focus": {
      background: colours.brandPrimary,
      svg: {
        fill: "#fff",
      },
    },

    "&:disabled": {
      opacity: 0.3,
      cursor: "default",
    },
  },
});

const MediaItem: React.FC<{ item: SectionMediaItem }> = ({ item }) => {
  const isVideo = item.mime?.startsWith("video/");
  const isImage = item.mime?.startsWith("image/");
  const alt = item.name || "";

  if (isImage && item.localFile?.childImageSharp?.gatsbyImageData) {
    return (
      <GatsbyImage
        alt={alt}
        image={item.localFile.childImageSharp.gatsbyImageData}
        css={css({ borderRadius: "8px" })}
      />
    );
  }

  if (isVideo) {
    const src = item.localFile?.publicURL || item.url;
    if (!src) return null;
    return <video controls src={src} aria-label={alt} />;
  }

  if (isImage && (item.localFile?.publicURL || item.url)) {
    const src = item.localFile?.publicURL || item.url || "";
    return <img src={src} alt={alt} css={css({ width: "100%", borderRadius: "8px" })} />;
  }

  return null;
};

interface SectionMediaProps {
  media: SectionMediaItem[];
  className?: string;
}

export const SectionMedia: React.FC<SectionMediaProps> = ({ media, className }) => {
  if (media.length === 0) return null;

  if (media.length === 1) {
    return (
      <div className={className} css={stylesMediaContainer}>
        <MediaItem item={media[0]} />
      </div>
    );
  }

  return (
    <div className={className} css={stylesMediaContainer}>
      <CarouselProvider
        naturalSlideWidth={600}
        naturalSlideHeight={400}
        totalSlides={media.length}
        isIntrinsicHeight={true} // overrides naturalSlide aspect ratio — slides size to content
        infinite={true}
      >
        <Slider>
          {media.map((item, idx) => (
            <Slide key={idx} index={idx}>
              <MediaItem item={item} />
            </Slide>
          ))}
        </Slider>
        <div css={stylesCarouselNav}>
          <ButtonBack>
            <span css={stylesScreenReaderText}>Previous</span>
            <FaIcons iconStyle={IconStyles.SOLID} icon="chevron-left" />
          </ButtonBack>
          <ButtonNext>
            <span css={stylesScreenReaderText}>Next</span>
            <FaIcons iconStyle={IconStyles.SOLID} icon="chevron-right" />
          </ButtonNext>
        </div>
      </CarouselProvider>
    </div>
  );
};

/**
 * Two-column layout: left content (heading + text) takes available space,
 * media sits to the right. On mobile, stacks vertically.
 */
const stylesSectionRow = css(gridContainer(), {
  alignItems: "flex-start",
});

const stylesLeftColumn = css(
  cols(12),
  cols(7, mediaBreakpoints.md),
);

const stylesMediaColumn = css(
  cols(12),
  cols(5, mediaBreakpoints.md),
  {
    [`${breakpointStrings.md}`]: {
      display: "flex",
      alignItems: "center",
    },
  },
);

interface SectionWithMediaProps {
  /** The left-side content (heading, text, etc.) */
  children: React.ReactNode;
  /** Optional media items to render on the right */
  media?: SectionMediaItem[] | null;
  className?: string;
}

/**
 * Wraps a section's content (children on left) with optional media on the right.
 * If no valid media, renders children full-width without the grid wrapper.
 */
export const SectionWithMedia: React.FC<SectionWithMediaProps> = ({
  children,
  media,
  className,
}) => {
  const validMedia = filterValidMedia(media);

  if (validMedia.length === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={className} css={stylesSectionRow}>
      <div css={stylesLeftColumn}>{children}</div>
      <div css={stylesMediaColumn}>
        <SectionMedia media={validMedia} />
      </div>
    </div>
  );
};

export default SectionMedia;
