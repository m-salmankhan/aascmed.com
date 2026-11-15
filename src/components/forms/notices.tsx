import React, { MouseEventHandler, ReactNode, useState } from 'react';
import { css } from '@emotion/react';
import { FaIcons, IconStyles } from '../font-awesome';
import { stylesScreenReaderText } from '../../styles/accessibility';
import { bounceTransition, colours, nudge } from '../../styles/theme';

type TransitionType = 'fade' | 'shrinkUp';

interface NoticeProps {
  className?: string;
  children: ReactNode;
  onDismiss?: () => void;
  /** Dismiss by collapsing height (shrinkUp) unless fade is explicitly requested. */
  transitionType?: TransitionType;
}

enum NoticeStates {
  VISIBLE,
  INVISIBLE,
  REMOVED,
}

const stylesNotice = (state: NoticeStates, transitionType?: TransitionType) => {
  const cleanedTransitionType = transitionType || 'shrinkUp';

  let opacity: string;
  let transform: string;
  let maxHeight: string;
  let overflowY: string;

  if (cleanedTransitionType === 'fade') {
    opacity = state === NoticeStates.INVISIBLE ? '0' : '1';
    transform = `translateY(-${state === NoticeStates.INVISIBLE ? 100 : 0}%)`;
    maxHeight = 'inherit';
    overflowY = 'inherit';
  } else {
    opacity = '1';
    transform = `none`;
    maxHeight = state === NoticeStates.INVISIBLE ? '0' : '100%';
    overflowY = 'hidden';
  }

  return css`
    position: relative;
    padding: 1em;
    border-radius: 0.5em;
    transition:
      opacity 0.5s ease 0s,
      transform 0.5s ease 0s,
      max-height 0.5s ease 0s;
    opacity: ${opacity};
    transform: ${transform};
    max-height: ${maxHeight};
    overflow-y: ${overflowY};
    animation: ${nudge} 0.25s ease-in 0.5s 2 forwards running;

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
      transition:
        transform 0.5s ${bounceTransition} 0s,
        background-color 0.5s ease 0s;

      svg {
        width: 1rem;
        height: 1rem;
        vertical-align: middle;
      }

      &:focus {
        transform: scale(0.8);
      }
    }

    .heading,
    .body {
      display: inline-block;
    }

    .heading {
      font-weight: bold;
      margin-right: 0.5em;

      .icon {
        width: 1em;
        height: 1em;
        margin-right: 0.5em;
        vertical-align: middle;
      }
    }

    a {
      color: inherit;
    }
  `;
};

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
`;

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
`;

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
`;

const variants = {
  error: {
    styles: stylesError,
    icon: 'triangle-exclamation',
    heading: 'Error:',
  },
  success: { styles: stylesSuccess, icon: 'circle-check', heading: 'Success!' },
  info: { styles: stylesInfo, icon: 'circle-info', heading: 'Info:' },
};

export const Notice: React.FC<
  NoticeProps & { variant: keyof typeof variants }
> = ({ variant, ...props }) => {
  const [state, setState] = useState(NoticeStates.VISIBLE);
  const appearance = variants[variant];
  const animateOut: MouseEventHandler = (event) => {
    event.preventDefault();
    setState(NoticeStates.INVISIBLE);
  };
  const removeFromDOM: React.TransitionEventHandler<HTMLDivElement> = (
    event,
  ) => {
    if (
      event.target !== event.currentTarget ||
      state !== NoticeStates.INVISIBLE
    )
      return;
    setState(NoticeStates.REMOVED);
    props.onDismiss?.();
  };
  if (state === NoticeStates.REMOVED) return null;
  return (
    <div
      className={props.className}
      css={[stylesNotice(state, props.transitionType), appearance.styles]}
      onTransitionEnd={removeFromDOM}
    >
      <div onTransitionEnd={(event) => event.stopPropagation()}>
        <button className="collapse" onClick={animateOut}>
          <span css={stylesScreenReaderText}>Close</span>
          <FaIcons iconStyle={IconStyles.SOLID} icon="xmark" className="icon" />
        </button>
        <div className="heading">
          <FaIcons
            iconStyle={IconStyles.SOLID}
            icon={appearance.icon}
            className="icon"
          />
          {appearance.heading}
        </div>
        <div className="body">{props.children}</div>
      </div>
    </div>
  );
};

export const ErrorNotice: React.FC<NoticeProps> = (props) => (
  <Notice {...props} variant="error" />
);
export const SuccessNotice: React.FC<NoticeProps> = (props) => (
  <Notice {...props} variant="success" />
);
export const InfoNotice: React.FC<NoticeProps> = (props) => (
  <Notice {...props} variant="info" />
);
