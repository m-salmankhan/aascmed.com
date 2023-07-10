import React, {HTMLProps, MouseEventHandler, useEffect, useState} from "react";
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
    REMOVED,

    // visually remove element
    PRE_COLLAPSE,
    // remove element from DOM
    COLLAPSED,
    // add element back in DOM (but still visually hidden)
    PRE_EXPAND
}

const stylesBookNowBubble = (state: BubbleStates) => {
    const hidden =
        (state === BubbleStates.PRE_COLLAPSE) ||
        (state === BubbleStates.INVISIBLE) ||
        (state === BubbleStates.PRE_EXPAND);

    return (css`
      position: relative;
      background: #fff;
      box-shadow: 0 0 1em rgba(0, 0, 0, 0.25);
      padding: ${gridSpacing/2}em;
      z-index: 10;
      margin-bottom: 1em;
      margin-right: 1em;
      border-radius: 1em;
      border-bottom-right-radius: 0em;


      transition: transform .5s ease-in-out 0s;
      transform: scale(${hidden ? 0 : 1});
    
      a:focus &, a:active & {
        border: 2px solid ${colours.brandPrimary};
      }
      
      h1 {
        margin-top: 0;
      }
      
      button {
        cursor: pointer;
        position: absolute;
        top: 1em;
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
    `)
};

interface BubbleProps extends HTMLProps<HTMLAnchorElement> {
    collapse: boolean
}
const Bubble: React.FC<BubbleProps> = ({children, collapse, ...props}) => {
    const [visibilityState, setVisibilityState] = useState(BubbleStates.VISIBLE);

    useEffect(() => {
        switch (visibilityState) {
            case BubbleStates.VISIBLE:
                if(collapse) setVisibilityState(BubbleStates.PRE_COLLAPSE);
                break
            // button should reappear
            case BubbleStates.COLLAPSED:
                if(!collapse) setVisibilityState(BubbleStates.PRE_EXPAND);
                break
            case BubbleStates.PRE_EXPAND:
                setVisibilityState(BubbleStates.VISIBLE);
                break
        }
    }, [visibilityState, setVisibilityState, collapse]);

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
    const handleTransitionEnd = () => {
        switch (visibilityState) {
            case BubbleStates.INVISIBLE:
                setVisibilityState(BubbleStates.REMOVED);
                break
            case BubbleStates.PRE_COLLAPSE:
                setVisibilityState(BubbleStates.COLLAPSED);
                break
        }
    }

    if(visibilityState === BubbleStates.REMOVED || visibilityState === BubbleStates.COLLAPSED) return <></>;
    return (
        <a {...props} css={[resetLinkStyles]}>
            <div css={stylesBookNowBubble(visibilityState)} onTransitionEnd={handleTransitionEnd}>
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
  box-shadow: 0 0 1em rgba(0, 0, 0, 0.25);
  border-radius: 5em;
  border-bottom-right-radius: ${collapsed ? 5 : 0}em;
  border-top-right-radius: ${collapsed ? 5 : 0}em;
  padding: 1em ${collapsed ? "1em" : "1.5em"};
  margin: 0 ${collapsed ? 1 : 0}em 0 auto;
  
  transition: max-width 1s ease-in-out 0s, border-radius .5s ease 0s, margin .5s ease 0s;
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
  right: 0;
  z-index: 10;
  
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
        <aside css={stylesZocDoc}>
            <Bubble href={ZocDocURL} target={"_BLANK"} rel={"noopener"} collapse={collapse} />
            <BookButton href={ZocDocURL} target={"_BLANK"} rel={"noopener"} collapse={collapse} />
        </aside>
    );
}