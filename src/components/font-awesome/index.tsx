import React, {CSSProperties} from "react"
// @ts-ignore
import brands from "./brands.svg"
// @ts-ignore
import regular from "./regular.svg"
// @ts-ignore
import solid from "./solid.svg"

export const IconStyles = {
    BRANDS: brands,
    REGULAR: regular,
    SOLID: solid,
} as const;
/** Append an SVG symbol fragment to a sprite URL for Gatsby/Vite-compatible references.
 * @param url Imported public sprite URL.
 * @param symbol Sprite symbol identifier without a leading `#`.
 * @returns The sprite URL followed by its symbol fragment.
 */
const spriteSymbol = (url: string, symbol: string) => `${url}#${symbol}`;
export type IconStyles = typeof IconStyles[keyof typeof IconStyles];

type FaIconProps = {
    iconStyle: IconStyles,
    icon: string,
    className?: string,
    style?: CSSProperties,
};

export const FaIcons: React.FC<FaIconProps> = ({iconStyle, icon, className, ...props}) =>
  <svg {...props} className={className}>
    <use href={spriteSymbol(iconStyle, icon)}/>
  </svg>
