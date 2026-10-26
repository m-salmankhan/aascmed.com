import React, { ComponentPropsWithoutRef } from "react"
import logos from "./logo-sprites.svg"

// SVG imports resolve to a public URL in Gatsby and Astro; append the fragment
// only at the <use> reference so the same sprite contract works in both builds.
const spriteSymbol = (url: string, symbol: string) => `${url}#${symbol}`;

type SVGProps = ComponentPropsWithoutRef<"svg">;
export const HorizontalLogo: React.FC<SVGProps> = (props) =>
    <svg {...props}>
        <use href={spriteSymbol(logos, "horizontal")} />
    </svg>


export const StackedLogo: React.FC<SVGProps> = (props) =>
    <svg {...props}>
        <use href={spriteSymbol(logos, "stacked")} />
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
        <use href={spriteSymbol(logos, "icon")} />
    </svg>

