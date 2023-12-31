import React, { HTMLProps, useEffect, useRef, useState } from "react";
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image";
import { Navigation } from "./navigation";
import { css } from "@emotion/react";
import { PaddedContainer } from "../containers";
import { colours, fontBaseSize, gridSpacing } from "../../styles/theme";
import { breakpointStrings } from "../../styles/breakpoints";
import { CSSInterpolation } from "@emotion/serialize";
import ReactMarkdown from "react-markdown";

interface HeroProps extends HTMLProps<HTMLDivElement> {
    heading: string,
    text: string,
    image?: IGatsbyImageData,
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
    padding: "2rem",
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


const stylesNavigation = css({
    position: "relative",
    zIndex: 1,
});

const stylesHeroBackgroundImage = css({
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
    zIndex: 0,
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
    const percentage = window.scrollY / height;
    const backgroundOpacity = Math.min(Math.pow(percentage, 1 - percentage), 1);
    const textTranslation = (backgroundOpacity === 1) ? 100 : percentage * 30;
    return {
        backgroundOpacity,
        textTranslation,
    }
}

export const Hero: React.FC<HeroProps> = ({ heading, text, image, children }) => {
    const headerRef = useRef<HTMLElement | null>(null);
    const [parallax, setParallax] = useState<ParallaxParameters>({ textTranslation: 0, backgroundOpacity: 0 });

    // Parallax Effect
    useEffect(() => {
        const updateParallax = () => {
            if (!headerRef.current)
                return;

            const header = headerRef.current as HTMLElement;
            const heroHeight = header.scrollHeight;
            requestAnimationFrame(() => setParallax(getParallaxValues(heroHeight)));
        }

        addEventListener("scroll", updateParallax);
        addEventListener("resize", updateParallax);

        return () => {
            removeEventListener("scroll", updateParallax);
            removeEventListener("resize", updateParallax);
        }
    }, [headerRef, setParallax]);

    return (
        <PaddedContainer css={stylesHero}>
            <header ref={headerRef}>
                {image && <GatsbyImage css={stylesHeroBackgroundImage} draggable={false} image={image} alt={""} loading="eager" />}
                <Navigation css={stylesNavigation} frontPage={true} />
                <div className="translate" css={css(stylesHeroContent)} style={{ transform: `translate3d(0, -${parallax.textTranslation}%, 0)` }}>
                    <div>
                        {children}
                        <h2>{heading}</h2>
                        <ReactMarkdown>
                            {text}
                        </ReactMarkdown>
                    </div>
                </div>
                <div />
                <div css={stylesHeroOverlay} style={{ opacity: parallax.backgroundOpacity }} />
            </header>
        </PaddedContainer>
    );
}