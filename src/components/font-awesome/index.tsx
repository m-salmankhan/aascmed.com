import React from "react"
import brands from "./brands.svg"
import regular from "./regular.svg"
import solid from "./solid.svg"

export enum IconStyles {
    BRANDS = brands,
    REGULAR = regular,
    SOLID = solid,
}

type FaIconProps = {
    iconStyle: IconStyles,
    icon: string,
    className: string,
};

export const FaIcons: React.FC<FaIconProps> = ({iconStyle, icon, props}) =>
  <svg {...props}>
    <use href={`${iconStyle}#${icon}`}/>
  </svg>
