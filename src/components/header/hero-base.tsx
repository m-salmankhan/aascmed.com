import { observeParallax, parallaxValues } from "./parallax";
import React, { HTMLProps, useEffect, useRef } from "react";
import { css } from "@emotion/react";
import { PaddedContainer } from "../containers";
import { colours, fontBaseSize, gridSpacing } from "../../styles/theme";
import { breakpointStrings } from "../../styles/breakpoints";
import { CSSInterpolation } from "@emotion/serialize";

interface HeroProps extends Omit<HTMLProps<HTMLDivElement>, "media"> {
    heading: string,
    textContent?: React.ReactNode,
    media?: React.ReactNode,
    image?: React.ReactNode,
    navigation?: React.ReactNode,
}

const stylesHero = css({
    minHeight: "60vh",
    marginBottom: `${2 * gridSpacing}em`,
    backgroundColor: "green",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
    backgroundPosition: "75% center",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    paddingBlock: "2rem",
    position: "relative",
    fontSize: fontBaseSize,
});

const stylesHeroContent: CSSInterpolation = {
    zIndex: 1,
    position: "relative",
    width: "100%",
    margin: `${gridSpacing / 2}em 0`,
    willChange: "transform",

    "h1, h2": {
        marginTop: "1em",
        fontSize: "2.25rem",
        lineHeight: 1.25,

        "@media screen and (min-width: 60em)": {
            fontSize: "3rem",
        }
    }
};

stylesHeroContent[breakpointStrings.md] = {
    margin: `${gridSpacing * 2}em 0`,
    width: "75%",
};

stylesHeroContent[breakpointStrings.lg] = {
    width: "50%",
};


const stylesHeroBackgroundImage = css({
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
    "> *": {
        width: "100%",
        height: "100%",
    },
});

const stylesHeroOverlay = css({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: colours.brandGradient,
    zIndex: 0,
    opacity: 0,
    willChange: "opacity",
})

export const HeroBase: React.FC<HeroProps> = ({ heading, textContent, media, image, navigation, children }) => {
    const headerRef = useRef<HTMLElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => observeParallax(window, reducedMotion => {
        if (!headerRef.current || !contentRef.current || !overlayRef.current) return;
        const values = parallaxValues(window.scrollY, headerRef.current.scrollHeight);
        contentRef.current.style.transform = reducedMotion ? 'none' : `translate3d(0, -${values.textTranslation}%, 0)`;
        overlayRef.current.style.opacity = reducedMotion ? '0' : String(values.backgroundOpacity);
    }), []);

    return (
        <PaddedContainer css={stylesHero}>
            <header ref={headerRef}>
                {image && <div css={stylesHeroBackgroundImage}>{image}</div>}
                {navigation}
                <div ref={contentRef} className="translate" css={css(stylesHeroContent)}>
                    <div css={media ? css({ display: 'flex', gap: '2em', alignItems: 'center', flexWrap: 'wrap', [`@media screen and (min-width: ${breakpointStrings.md})`]: { flexWrap: 'nowrap' } }) : undefined}>
                        <div css={media ? css({ flex: '1 1 60%' }) : undefined}>
                            {children}
                            <h2>{heading}</h2>
                            {textContent}
                        </div>
                        {media && <div css={css({ flex: '1 1 35%', maxWidth: '400px' })}>{media}</div>}
                    </div>
                </div>
                <div />
                <div ref={overlayRef} css={stylesHeroOverlay} />
            </header>
        </PaddedContainer>
    );
}
