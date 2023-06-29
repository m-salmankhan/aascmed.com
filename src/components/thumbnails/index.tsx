import React, {ReactNode} from "react";
import {css} from "@emotion/react";
import {bounceTransition, colours} from "../../styles/theme";
import {FaIcons, IconStyles} from "../font-awesome";
import {GatsbyImage, IGatsbyImageData} from "gatsby-plugin-image";
import Color from "color";

const stylesThumbnail = (iconSize: number, showOverlay: boolean, elipse: boolean) => css`
  border-radius: ${elipse ? "50%" : "inherit"};
    position: relative;
    overflow: hidden;
    transition: transform .25s ease 0s;

    .gatsby-image-wrapper {
        height: 100%;
    }
    
    .overlay {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        background: linear-gradient(to top right, ${Color(colours.brandPrimary).darken(0.3).fade(0.1).toString()}, ${Color(colours.brandSecondary).darken(0.3).fade(0.1).toString()});
        opacity: ${showOverlay ? 1 : 0};
        transition: opacity .25s ease-in-out 0s;

        @media (prefers-reduced-motion) {
            transition: opacity 0.05s ease-in-out 0s;
        }

        .icon {
            fill: #fff;
            width: ${iconSize}rem;
            height: ${iconSize}rem;
            transition: transform 1s ${bounceTransition} 0s;

            "@media (prefers-reduced-motion)": {
                transition: transform 0.05s ${bounceTransition} 0s;
            }
        }
    }
  
    a:hover &, a:focus &, a:active & {
        .overlay {
            opacity: 1;
            .icon {
              transform: scale(1.5);
              fill: #fff;
            }
        }
    }
  
    a:focus &, a:active & {
        .overlay {
            background: linear-gradient(to top right, ${Color(colours.brandPrimary).darken(0.8).fade(0.1).toString()}, ${Color(colours.brandSecondary).darken(0.3).fade(0.1).toString()});
            .icon {
              fill: ${colours.infoYellow};
            }
        }
    }
  
    a:hover &, a:focus &, a:active & {
        outline: none;
        border: none;

        ".thumbnail": {
            ".overlay": {
                opacity: 1;

                ".icon": {
                    transform: scale(1.5);
                }
            }
        }
    },
`;

interface ThumbnailProps {
    className?: string
    overlayIcon: string
    overlayIconStyle: IconStyles,
    overlayIconSize?: number,
    image?: IGatsbyImageData,
    imageAlt?: string,
    shape?: "elipse" | "rect",
    showOverlay?: boolean
}
export const Thumbnail: React.FC<ThumbnailProps> = ({
                                                        className,
                                                        image,
                                                        imageAlt,
                                                        overlayIconStyle,
                                                        overlayIcon,
                                                        overlayIconSize,
                                                        showOverlay,
                                                        shape,
}) => {
    return(
        <div className={className} css={css(stylesThumbnail(overlayIconSize || 3, showOverlay || false, shape==="elipse"))}>
            {image && <GatsbyImage alt={imageAlt || ""} image={image}/>}
            <div className={"overlay"}>
                <FaIcons iconStyle={overlayIconStyle} icon={overlayIcon} className={"icon"} />
            </div>
        </div>
    )
}