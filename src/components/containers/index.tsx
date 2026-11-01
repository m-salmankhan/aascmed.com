import type { ReactNode } from "react";
import { css } from "@emotion/react";
import { contentGutter } from "../../styles/theme";

interface ContainerProps {
    children: ReactNode;
    className?: string;
    id?: string;
}

const stylesContainer = css`
  width: calc(100% - 2 * ${contentGutter});
  margin-inline: auto;
`;

/** Center content using the shared width cap and responsive page gutters. */
export function Container({ children, ...props }: ContainerProps) {
    return <div css={stylesContainer} {...props}>{children}</div>;
}

const stylesContainerPadded = css`
  width: 100%;
  padding-inline: ${contentGutter};
`;

/** Keep backgrounds full width while aligning content with regular containers. */
export function PaddedContainer({ children, ...props }: ContainerProps) {
    return <div css={stylesContainerPadded} {...props}>{children}</div>;
}
