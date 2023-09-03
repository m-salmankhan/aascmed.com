import React, {CSSProperties} from "react"
// @ts-ignore
import brands from "./brands.svg"
// @ts-ignore
import regular from "./regular.svg"
// @ts-ignore
import solid from "./solid.svg"

export enum IconStyles {
    BRANDS = brands,
    REGULAR = regular,
    SOLID = solid,
}

type FaIconProps = {
    iconStyle: IconStyles,
    icon: string,
    className?: string,
    style?: CSSProperties,
};

export const FaIcons: React.FC<FaIconProps> = ({iconStyle, icon, className, ...props}) =>
  <svg {...props} className={className}>
    <use href={`${iconStyle}#${icon}`}/>
  </svg>
