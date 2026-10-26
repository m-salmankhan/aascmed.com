import { Global } from "@emotion/react";
import { stylesGlobal } from "../../styles/global";
import React, { ReactNode, useEffect } from "react";
import { ZocDoc } from "../zocdoc";
import { Script } from "gatsby";




interface AppProps {
    children?: ReactNode
    useTracking?: boolean
    className?: string
}

export const App: React.FC<AppProps> = ({ children, className, useTracking }) => {
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'strapiUpdate') {
                window.location.reload();
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);    

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
