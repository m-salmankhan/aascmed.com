import React, { ComponentPropsWithoutRef } from "react"
import logos from "./logo-sprites.svg"

/** Append a symbol fragment where the SVG `<use>` references the imported sprite.
 * @param url Imported public sprite URL used by Gatsby and Astro.
 * @param symbol Sprite symbol identifier without a leading `#`.
 * @returns The sprite URL followed by its symbol fragment.
 */
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

