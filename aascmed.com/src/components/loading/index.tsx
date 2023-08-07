import { ReactNode } from "react"
import { FaIcons, IconStyles } from "../font-awesome"
import { css, keyframes } from "@emotion/react"
import { colours } from "../../styles/theme";

const spin = keyframes`
    from {
        transform: rotate(0);
    }
    to {
        transform: rotate(360deg);
    }
`

const stylesLoading = css`
    text-align: center;

    svg {
        display: block;
        width: 5rem;
        height: 5rem;
        margin: 1rem auto;
        animation: ${spin} 1.5s steps(8) 0s infinite normal running;
        fill: ${colours.brandPrimary};
    }
`;

interface LoadingProps {
    className?: string
    children?: ReactNode
}

export const Loading = (props: LoadingProps) =>
    <div className={props.className} css={stylesLoading}>
        <FaIcons iconStyle={IconStyles.SOLID} icon="spinner" />
        {props.children}
    </div>