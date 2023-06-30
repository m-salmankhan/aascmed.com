import React, {HTMLProps} from "react"
import propTypes from "prop-types"
import logos from "./logo-sprites.svg"
import {css} from "@emotion/react";

type SVGProps = HTMLProps<SVGProps>;
const stylesHorizontalLogo = css({

});
export const HorizontalLogo: React.FC<SVGProps> = (props) =>
    <svg {...props} css={stylesHorizontalLogo}>
        <use href={logos + "#horizontal"}/>
    </svg>

const stylesStackedLogo = css({

});
export const StackedLogo: React.FC<SVGProps> = (props) =>
    <svg {...props} css={stylesStackedLogo}>
        <use href={logos + "#stacked"}/>
    </svg>

type Orientation = "stacked" | "horizontal";
type LogoSpriteProps = HTMLProps<SVGProps> & {
    orientation: Orientation,
}
export const LogoSprite: React.FC<LogoSpriteProps> = ({orientation, ...props}) => {
    if(orientation === "stacked")
        return <StackedLogo {...props} />

    return <HorizontalLogo {...props} />
}


export const Logo = () =>
    <svg className="logo-icon">
        <use href={`${logos}#icon`}/>
    </svg>

