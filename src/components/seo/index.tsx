import React from "react";
import { useSiteMetadata } from "../../hooks/useSiteMetadata";
import { ReactNode } from "react";
import { colours } from "../../styles/theme";
import { Script } from "gatsby";
import {useAnalyticsIDs} from "../../hooks/useAnalyticsIDs";

interface SEOProps {
    description: string
    slug: string
    title: string
    appendBusinessNameToTitle?: boolean
    useTracking?: boolean
    image?: string
    children?: ReactNode
}

const Favicons = () =>
    <>
        <link rel="icon" type="image/svg" href="/assets/favicon/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="120x120" href="/assets/favicon/favicon-120x120.png" />
        <link rel="icon" type="image/png" sizes="300x300" href="/assets/favicon/favicon-300x300.png" />
        <link rel="icon" type="image/ico" href="/assets/favicon/favicon.ico" />
    </>

export const SEO = (props: SEOProps) => {
    const siteMetadata = useSiteMetadata();
    const siteTitle = siteMetadata.title;
    const appendBusinessNameToTitle = props.appendBusinessNameToTitle === undefined ? true : props.appendBusinessNameToTitle;
    const useTracking = props.useTracking === true;
    const siteURL = siteMetadata.url;
    const twitterHandle = siteMetadata.twitter;

    const analyticsIDs = useAnalyticsIDs()

    const pageTitle = props.title ?
        (props.title + (appendBusinessNameToTitle ? ` | ${siteTitle}` : "")) :
        siteTitle;
    const socialImage = props.image ? siteURL + props.image : `${siteURL}/assets/favicon/favicon-300x300.png`;

    return (
        <>
            <meta name="google-site-verification" content="AJxvzTXiJ6uf53Wmy2F6q-aoLvLGVCjDsHWfTU4Mhkg" />
            { useTracking &&
                <>
                {/* Google Tag */}
                <script async src={`https://www.googletagmanager.com/gtag/js?id=${analyticsIDs.googleAnalyticsID}`} />
                {/* Google Tag Manager */}
                <script id={"gtag"} dangerouslySetInnerHTML={{ __html: `
                    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                    })(window,document,'script','dataLayer','${analyticsIDs.googleTagManagerID}');
                    window.gtag = function() { dataLayer.push(arguments); }

                    // grant full permisison in US (excluding CA) and none in Rest of World.
                    window.gtag('consent', 'default', {
                        'ad_storage': 'granted',
                        'ad_user_data': 'granted',
                        'ad_personalization': 'granted',
                        'analytics_storage': 'granted',
                        'region': ['US']
                    });
                    window.gtag('consent', 'default', {
                        'ad_storage': 'denied',
                        'ad_user_data': 'denied',
                        'ad_personalization': 'denied',
                        'analytics_storage': 'denied',
                    });
                `}}/>

                {/* Facebook Pixel Code */}
                <script dangerouslySetInnerHTML={{
                    __html: `!function(f,b,e,v,n,t,s)
                    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)}(window,document,'script',
                    'https://connect.facebook.net/en_US/fbevents.js');
                    fbq('init', '${analyticsIDs.pixelID}'); 
                    fbq('track', 'PageView');`}}
                />
                <noscript>
                    <img height="1" width="1" src={`https://www.facebook.com/tr?id=${analyticsIDs.pixelID}&ev=PageView&noscript=1`}/>
                </noscript>
                </>
            }

            <html lang="en-US" />
            <title>{pageTitle}</title>
            <meta name={"description"} content={props.description} />
            <link rel={"canonical"} href={siteURL + props.slug} />
            <Favicons />

            {/* OpenGraph */}
            <meta name={"og:url"} content={siteURL + props.slug} />
            <meta name={"og:title"} content={pageTitle} />
            <meta name={"og:description"} content={props.description} />
            <meta name={"theme-color"} content={colours.brandPrimary} />
            <meta name={"og:image"} content={socialImage} />

            {/* Twitter Cards */}
            <meta name={"twitter:card"} content={"summary"} />
            <meta name={"twitter:image"} content={socialImage} />
            <meta name={"twitter:description"} content={props.description} />
            {
                twitterHandle &&
                <meta name={"twitter:site"} content={twitterHandle} />
            }
            {props.children}
        </>
    );
}
