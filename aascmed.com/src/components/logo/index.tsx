import React, { ComponentPropsWithoutRef } from "react"
import logos from "./logo-sprites.svg"

type SVGProps = ComponentPropsWithoutRef<"svg">;
export const HorizontalLogo: React.FC<SVGProps> = (props) =>
    <svg {...props}>
        <use href={logos + "#horizontal"} />
    </svg>


export const StackedLogo: React.FC<SVGProps> = (props) =>
    <svg {...props}>
        <use href={logos + "#stacked"} />
    </svg>

type Orientation = "stacked" | "horizontal";
type LogoSpriteProps = SVGProps & {
    orientation: Orientation,
}

export const LogoSprite: React.FC<LogoSpriteProps> = ({ orientation, ...props }) => {
    if (orientation === "stacked")
        return <StackedLogo {...props} />

    return <HorizontalLogo {...props} />
}


export const Logo = (props: { className?: string }) =>
    <svg className={props.className}>
        <use href={`${logos}#icon`} />
    </svg>

