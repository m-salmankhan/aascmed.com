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

// what variables the parallax effect is made of
interface ParallaxParameters {
    textTranslation: number,
    backgroundOpacity: number
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

const getParallaxValues = (height: number): ParallaxParameters => {
    const percentage = Math.min(Math.max(window.scrollY / Math.max(height, 1), 0), 1);
    const backgroundOpacity = Math.min(Math.pow(percentage, 1 - percentage), 1);
    const textTranslation = (backgroundOpacity === 1) ? 100 : percentage * 30;
    return {
        backgroundOpacity,
        textTranslation,
    }
}

export const HeroBase: React.FC<HeroProps> = ({ heading, textContent, media, image, navigation, children }) => {
    const headerRef = useRef<HTMLElement | null>(null);
    const contentRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        let frame: number | undefined;
        const update = () => {
            frame = undefined;
            if (!headerRef.current || !contentRef.current || !overlayRef.current) return;
            const values = getParallaxValues(headerRef.current.scrollHeight);
            contentRef.current.style.transform = `translate3d(0, -${values.textTranslation}%, 0)`;
            overlayRef.current.style.opacity = String(values.backgroundOpacity);
        };
        const schedule = () => {
            if (motion.matches || frame !== undefined) return;
            frame = window.requestAnimationFrame(update);
        };
        const motionChanged = () => {
            if (frame !== undefined) window.cancelAnimationFrame(frame);
            frame = undefined;
            if (motion.matches) {
                if (contentRef.current) contentRef.current.style.transform = 'none';
                if (overlayRef.current) overlayRef.current.style.opacity = '0';
            } else schedule();
        };
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        motion.addEventListener('change', motionChanged);
        motionChanged();
        return () => {
            window.removeEventListener('scroll', schedule);
            window.removeEventListener('resize', schedule);
            motion.removeEventListener('change', motionChanged);
            if (frame !== undefined) window.cancelAnimationFrame(frame);
        };
    }, []);

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
