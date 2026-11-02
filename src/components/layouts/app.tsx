import { Global } from "@emotion/react";
import { stylesGlobal } from "../../styles/global";
import React, { ReactNode } from "react";
import { ZocDoc } from "../zocdoc";

interface AppProps {
    children?: ReactNode
    useTracking?: boolean
    className?: string
}

/** Wrap page content with shared global styles and optional tracking markup.
 * @param props Page children, optional wrapper class, and whether tracking markup is enabled.
 * @returns The application layout containing the supplied page content.
 */
export function App({ children, className, useTracking }: AppProps): React.ReactElement {
    return <div className={className}>
        { !!useTracking &&
        <>
        {/* Google Tag Manager (noscript)*/}
            <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NB7HM293" height="0" width="0" css={{display: 'none', visibility: 'hidden'}}></iframe></noscript>
        {/* End Google Tag Manager (noscript)*/}
        </>
        }

        <Global styles={stylesGlobal} />
        {children}
        <ZocDoc />
    </div>
}
