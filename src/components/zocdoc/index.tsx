import React, {HTMLProps, MouseEventHandler, useEffect, useRef, useState} from "react";
import {H1, stylesH3} from "../headings";
import {css} from "@emotion/react";
import {bounceTransition, colours, gridSpacing} from "../../styles/theme";
import {breakpointStrings} from "../../styles/breakpoints";
import {FaIcons, IconStyles} from "../font-awesome";
import {stylesScreenReaderText} from "../../styles/accessibility";

export const ZocDocURL = "https://www.zocdoc.com/practice/allergy-asthma-and-sinus-centers-3233";

const resetLinkStyles = css`
  text-decoration: none;
  color: inherit;
`

enum BubbleStates {
    // visible to user & screen readers
    VISIBLE,

    // hidden to users, visible to screen readers
    INVISIBLE,

    // hidden to users & screen readers
    REMOVED
}

const stylesBookNowBubble = (state: BubbleStates, collapse: boolean) => css`
  position: relative;
  background: #fff;
  box-shadow: 0 0 1em rgba(0, 0, 0, 0.25);
  padding: ${gridSpacing/2}em;
  z-index: 10;
  margin-bottom: 1em;
  
  transition: transform .5s ease-in-out 0s;
  transform: scale(${state === BubbleStates.INVISIBLE ? 0 : (collapse ? 0 : 1)});

  a:focus &, a:active & {
    border: 2px solid ${colours.brandPrimary};
  }
  
  button {
    cursor: pointer;
    position: absolute;
    top: 2em;
    right: 1em;
    background: none;
    outline: none;
    border: none;
    padding: 0.1em;
    transition: transform .5s ${bounceTransition} 0s;
    
    &:hover, &:focus {
      border-radius: 50%;
      background: ${colours.infoBlue};

      svg {
        fill: ${colours.infoYellow};
      }
    }
    
    &:focus {
      transform: scale(1.5);
    }


    svg {
      width: 1.5em;
      height: 1.5em;
      vertical-align: middle;
    }
  }
  
`;

interface BubbleProps extends HTMLProps<HTMLAnchorElement> {
    collapse: boolean
}
const Bubble: React.FC<BubbleProps> = ({children, collapse, ...props}) => {
    const [visibilityState, setVisibilityState] = useState(BubbleStates.VISIBLE);

    // starts hide transition
    // after this, bubble is still visible to screen readers
    const hideBubble: MouseEventHandler = (e) => {
        e.preventDefault();
        if(visibilityState === BubbleStates.VISIBLE) {
            setVisibilityState(BubbleStates.INVISIBLE);
        }
        return false;
    }

    // stops being visible to screen readers
    const removeBubble = () => {
        if(visibilityState === BubbleStates.INVISIBLE) {
            setVisibilityState(BubbleStates.REMOVED);
        }
    }

    if(visibilityState === BubbleStates.REMOVED) return <></>;

    return (
        <a {...props} css={resetLinkStyles}>
            <div css={stylesBookNowBubble(visibilityState, collapse)} onTransitionEnd={removeBubble}>
                <H1 css={stylesH3}>Book online</H1>
                <button onClick={hideBubble}>
                    <span css={stylesScreenReaderText}>Dismiss</span>
                    <FaIcons iconStyle={IconStyles.SOLID} icon={"xmark"}/>
                </button>
                <p>See available appointment times and book an appointment right here.</p>
                <p>It's fast, free and secure.</p>
            </div>
        </a>
    )
}

const stylesBookButton = (collapsed: boolean) => css`
  background: ${colours.brandGradientReverse};
  color: #fff;
  border-radius: 5em;
  padding: 1em ${collapsed ? "1em" : "1.5em"};
  margin: 0 0 0 auto;
  
  will-change: max-width;
  transition: max-width 1s ease-in-out 0s;
  white-space: nowrap;
  overflow: hidden;
  max-width: ${collapsed ? "4em" : "15em"};
  
  a:hover &, a:focus &, a:active & {
    max-width: 15em;
    background: ${colours.infoBlue};
    color: ${colours.infoYellow};
    
    svg {
      fill: ${colours.infoYellow};
    }
  }

  .icon, .text {
    display: inline-block;
  }
  
  .icon {
    width: 2em;
    height: 2em;
    fill: #fff;
    vertical-align: middle;
    margin-right: 1em;
  }
  
  .text {
    vertical-align: middle;
    font-weight: bold;
    font-size: 1.2em;

    white-space: nowrap;
    overflow: hidden;
    will-change: max-width;
    transition: max-width 1s ease-in-out 0s;
    max-width: ${collapsed ? "0em" : "15em"};
    
    a:hover &, a:focus &, a:active & {
      max-width: 15em;
    }
  }
`;
interface BookButtonProps extends HTMLProps<HTMLAnchorElement> {
    collapse: boolean
}
const BookButton: React.FC<BookButtonProps> = ({collapse, ...props}) => {
    return (
        <a {...props} css={resetLinkStyles}>
            <div css={stylesBookButton(collapse)}>
                <FaIcons className={"icon"} iconStyle={IconStyles.SOLID} icon={"calendar-check"} />
                <div className={"text"}>Book online</div>
            </div>
        </a>
    )
}

const stylesZocDoc = css`
  position: fixed;
  bottom: ${gridSpacing}em;
  right: ${gridSpacing}em;
  
  width: 75%;
  ${breakpointStrings.sm} {
    width: 50%;
  }
  ${breakpointStrings.md} {
    width: 25%;
  }
  ${breakpointStrings.lg} {
    width: 20%;
  }

`;
export const ZocDoc = () => {
    const [collapse, setCollapse] = useState(false);

    useEffect(() => {
        const callBack = () => {
            setCollapse(window.scrollY > 600);
        }
        window.addEventListener("scroll", callBack);

        return () => {
            window.removeEventListener("scroll", callBack);
        }
    }, [setCollapse]);

    return (
        <div css={stylesZocDoc}>
            <Bubble href={ZocDocURL} target={"_BLANK"} rel={"noopener"} collapse={collapse} />
            <BookButton href={ZocDocURL} target={"_BLANK"} rel={"noopener"} collapse={collapse} />
        </div>
    );
}