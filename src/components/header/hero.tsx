import React, {useEffect, useRef, useState} from "react";
import {GatsbyImage, IGatsbyImageData} from "gatsby-plugin-image";
import {Navigation} from "./navigation";
import {css} from "@emotion/react";
import {PaddedContainer} from "../containers";
import {colours, fontBaseSize, gridSpacing} from "../../styles/theme";
import {breakpointStrings} from "../../styles/breakpoints";
import {CSSInterpolation} from "@emotion/serialize";
import {match} from "assert";

interface HeroProps extends HTMLDivElement {
    siteTitle: string,
    heading: string,
    text: string,
    image: IGatsbyImageData,
}

// what variables the parallax effect is made of
interface ParallaxParameters {
    textTranslation: number,
    backgroundOpacity: number
}

const stylesHero = css({
    minHeight: "60vh",
    marginBottom: `${2*gridSpacing}em`,
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
    margin: `${gridSpacing/2}em 0`,

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
    margin: `${gridSpacing*2}em 0`,
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

const stylesHeroOverlay = (opacity) => css({
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background: colours.brandGradient,
    zIndex: 0,
    opacity: opacity,
})

const getParallaxValues = (height: number): ParallaxParameters => {
    const percentage = window.scrollY / height;

    return {
        backgroundOpacity: Math.min(Math.pow(percentage, 1-percentage), 1),
        textTranslation: percentage*30,
    }
}

export const Hero: React.FC<HeroProps> = ({heading, text, image, siteTitle, children}) => {
    const headerRef = useRef<HTMLElement | null>(null);
    const [parallax, setParallax] = useState<ParallaxParameters>({textTranslation: 0, backgroundOpacity: 0});

    const [jsEnabled, setJSEnabled] = useState(false);
    // set JSEnabled to true after initial render
    useEffect(() => {
        setJSEnabled(true);
    }, [setJSEnabled]);


    // Parallax Effect
    useEffect(() => {
        const updateParallax = () => {
            if(!headerRef.current)
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
                <GatsbyImage css={stylesHeroBackgroundImage} draggable={false} image={image} alt={""}/>
                <Navigation css={stylesNavigation} siteTitle={siteTitle} frontPage={true} />
                <div className="translate" css={css(stylesHeroContent, {transform: `translate3d(0, -${parallax.textTranslation}%, 0)`})}>
                    <div>
                        {children}
                        <h2>{heading}</h2>
                        <div className="subtext">
                            {text}
                        </div>
                    </div>
                </div>
                <div/>
                <div css={stylesHeroOverlay(parallax.backgroundOpacity)}/>
            </header>
        </PaddedContainer>
    );
}