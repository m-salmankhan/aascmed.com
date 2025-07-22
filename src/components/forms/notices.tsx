import React, { MouseEventHandler, ReactNode, useState } from "react";
import { css } from "@emotion/react";
import { FaIcons, IconStyles } from "../font-awesome";
import { stylesScreenReaderText } from "../../styles/accessibility";
import { bounceTransition, colours, nudge } from "../../styles/theme";

type TransitionType = "fade" | "shrinkUp";

interface NoticeProps {
  className?: string
  children: ReactNode
  onDismiss?: () => void
  transitionType?: TransitionType
}

enum NoticeStates {
  VISIBLE,
  INVISIBLE,
  REMOVED
}

const stylesNotice = (state: NoticeStates, transitionType?: TransitionType) => {
  const cleanedTransitionType = transitionType || "fade";

  let opacity: string;
  let transform: string;
  let maxHeight: string;
  let overflowY: string;

  if(transitionType === "fade") {
    opacity = (state === NoticeStates.INVISIBLE) ? "0" : "1";
    transform = `translateY(-${state === NoticeStates.INVISIBLE ? 100 : 0}%)`;
    maxHeight = "inherit";
    overflowY = "inherit";
  } else {
    opacity = "1";
    transform = `none`;
    maxHeight = (state === NoticeStates.INVISIBLE) ? "0" : "100%";
    overflowY = "hidden";
  }

  return css`
      position: relative;
      padding: 1em;
      border-radius: .5em;
      transition: opacity .5s ease 0s, transform .5s ease 0s, max-height .5s ease 0s;
      opacity: ${opacity};
      transform: ${transform};
      max-height: ${maxHeight};
      overflow-Y: ${overflowY};
      animation: ${nudge} .25s ease-in .5s 2 forwards running;
      
      button.collapse {
        position: absolute;
        top: 1em;
        right: 1em;
        text-align: center;
        width: 2em;
        height: 2em;
        background: none;
        border: none;
        cursor: pointer;
        border-radius: 5em;
        transition: transform .5s ${bounceTransition} 0s, background-color .5s ease 0s;
        
        svg {
          width: 1rem;
          height: 1rem;
          vertical-align: middle;
        }
        
        &:focus {
          transform: scale(0.8);
        }
      }
      
      .heading, .body {
        display: inline-block;
        
      }
      
      .heading {
        font-weight: bold;
        margin-right: .5em;
        
        .icon {
          width: 1em;
          height: 1em;
          margin-right: .5em;
          vertical-align: middle;
        }
      }
    `;
}

const stylesError = css`
  background: ${colours.errBg};
  border: 1px solid ${colours.errTxt};
  color: ${colours.errTxt};
  
  .icon {
    fill: ${colours.errTxt};
  }
  
  button.collapse:focus {
    background: ${colours.errTxt};
    
    svg {
      fill: ${colours.errBg};
    }
  }
`

export const ErrorNotice: React.FC<NoticeProps> = (props) => {
  const [state, setState] = useState(NoticeStates.VISIBLE);

  const animateOut: MouseEventHandler = (e) => {
    e.preventDefault();
    setState(NoticeStates.INVISIBLE);
  }

  const removeFromDOM = () => {
    setState(NoticeStates.REMOVED);
    props.onDismiss && props.onDismiss();
  }

  if (state === NoticeStates.REMOVED) return <></>;
  return (
    <div className={props.className} css={[stylesNotice(state, props.transitionType), stylesError]} onTransitionEnd={removeFromDOM}>
      <div onTransitionEnd={(event) => event.stopPropagation()}>
        <button className={"collapse"} onClick={animateOut}>
          <span css={stylesScreenReaderText}>Close</span>
          <FaIcons iconStyle={IconStyles.SOLID} icon={"xmark"} className={"icon"} />
        </button>
        <div className={"heading"}>
          <FaIcons iconStyle={IconStyles.SOLID} icon={"triangle-exclamation"} className={"icon"} />
          Error:
        </div>
        <div className={"body"}>
          {props.children}
        </div>
      </div>
    </div>
  );
}


const stylesSuccess = css`
  background: ${colours.successBg};
  border: 1px solid ${colours.successTxt};
  color: ${colours.successTxt};
  
  .icon {
    fill: ${colours.successTxt};
  }
  
  button.collapse:focus {
    background: ${colours.successTxt};
    
    svg {
      fill: ${colours.successBg};
    }
  }
`

export const SuccessNotice: React.FC<NoticeProps> = (props) => {
  const [state, setState] = useState(NoticeStates.VISIBLE);

  const animateOut: MouseEventHandler = (e) => {
    e.preventDefault();
    setState(NoticeStates.INVISIBLE);
  }

  const removeFromDOM = () => {
    setState(NoticeStates.REMOVED);
    props.onDismiss && props.onDismiss();
  }

  if (state === NoticeStates.REMOVED) return <></>;
  return (
    <div className={props.className} css={[stylesNotice(state, props.transitionType), stylesSuccess]} onTransitionEnd={removeFromDOM}>
      <div onTransitionEnd={(event) => event.stopPropagation()}>
        <button className={"collapse"} onClick={animateOut}>
          <span css={stylesScreenReaderText}>Close</span>
          <FaIcons iconStyle={IconStyles.SOLID} icon={"xmark"} className={"icon"} />
        </button>
        <div className={"heading"}>
          <FaIcons iconStyle={IconStyles.SOLID} icon={"circle-check"} className={"icon"} />
          Success!
        </div>
        <div className={"body"}>
          {props.children}
        </div>
      </div>
    </div>
  );
}


const stylesInfo = css`
  background: ${colours.infoBlue};
  border: none;
  color: ${colours.infoYellow};
  
  .icon {
    fill: ${colours.infoYellow};
  }
  
  .heading {
    display: block;
  }

  button.collapse:focus {
    background: ${colours.infoYellow};
    
    svg {
      fill: ${colours.infoBlue};
    }
  }
`

export const InfoNotice: React.FC<NoticeProps> = (props) => {
  const [state, setState] = useState(NoticeStates.VISIBLE);

  const animateOut: MouseEventHandler = (e) => {
    e.preventDefault();
    setState(NoticeStates.INVISIBLE);
  }

  const removeFromDOM = () => {
    setState(NoticeStates.REMOVED);
    props.onDismiss && props.onDismiss();
  }

  if (state === NoticeStates.REMOVED) return <></>;
  return (
    <div className={props.className} css={[stylesNotice(state, props.transitionType), stylesInfo]} onTransitionEnd={removeFromDOM}>
      <div onTransitionEnd={(event) => event.stopPropagation()}>
        <button className={"collapse"} onClick={animateOut}>
          <span css={stylesScreenReaderText}>Close</span>
          <FaIcons iconStyle={IconStyles.SOLID} icon={"xmark"} className={"icon"} />
        </button>
        <div className={"heading"}>
          <FaIcons iconStyle={IconStyles.SOLID} icon={"circle-info"} className={"icon"} />
          Info:
        </div>
        <div className={"body"}>
          {props.children}
        </div>
      </div>
    </div>
  );
}