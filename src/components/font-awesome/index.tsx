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
// Keep fragments separate from imported sprite URLs for webpack/Vite parity.
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
