import React, { ComponentPropsWithoutRef } from "react"
import logos from "./logo-sprites.svg?url"

/** Append a symbol fragment where the SVG `<use>` references the imported sprite.
 * @param url Imported public sprite URL used by Gatsby and Astro.
 * @param symbol Sprite symbol identifier without a leading `#`.
 * @returns The sprite URL followed by its symbol fragment.
 */
const spriteSymbol = (url: string, symbol: string) => `${url}#${symbol}`;

/** SVG attributes accepted by the horizontal and stacked logo renderers. */
type SVGProps = ComponentPropsWithoutRef<"svg">;

/** Identifies a wordmark layout or the standalone brand icon in the sprite. */
type SpriteSymbol = "horizontal" | "stacked" | "icon";

/** Props for rendering one symbol from the imported logo sprite. */
interface SpriteLogoProps extends SVGProps {
    symbol: SpriteSymbol;
}

/** Selects one of the two wordmark layouts. */
type Orientation = "stacked" | "horizontal";

/** Orientation and SVG attributes for the public two-orientation logo. */
interface LogoSpriteProps extends SVGProps {
    orientation: Orientation;
}

/** CSS class applied to the standalone icon logo. */
interface LogoProps {
    className?: string;
}

/** Render an imported logo symbol as one SVG element.
 * @param props Symbol identifier and SVG attributes to apply to the root element.
 * @returns SVG markup that references the imported sprite symbol.
 */
function SpriteLogo({ symbol, ...props }: SpriteLogoProps): React.ReactElement {
    return <svg {...props}>
        <use href={spriteSymbol(logos, symbol)} />
    </svg>;
}

/** Render the horizontal wordmark with caller-supplied SVG attributes.
 * @param props SVG classes, styles, and accessibility attributes.
 * @returns The horizontal logo symbol.
 */
export function HorizontalLogo(props: SVGProps): React.ReactElement {
    return <SpriteLogo {...props} symbol="horizontal" />;
}

/** Render the stacked wordmark with caller-supplied SVG attributes.
 * @param props SVG classes, styles, and accessibility attributes.
 * @returns The stacked logo symbol.
 */
export function StackedLogo(props: SVGProps): React.ReactElement {
    return <SpriteLogo {...props} symbol="stacked" />;
}

/** Render the selected wordmark orientation with caller-supplied SVG attributes.
 * @param props The requested wordmark layout and root SVG presentation attributes.
 * @returns The horizontal or stacked logo symbol.
 */
export function LogoSprite({ orientation, ...props }: LogoSpriteProps): React.ReactElement {
    return <SpriteLogo {...props} symbol={orientation} />;
}

/** Render the standalone icon mark with an optional CSS class.
 * @param props Optional class name for the root SVG.
 * @returns The icon logo symbol.
 */
export function Logo(props: LogoProps): React.ReactElement {
    return <SpriteLogo className={props.className} symbol="icon" />;
}

