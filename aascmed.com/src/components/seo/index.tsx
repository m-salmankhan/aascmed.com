import React from "react";
import { useSiteMetadata } from "../../hooks/useSiteMetadata";
import { ReactNode } from "react";
import { colours } from "../../styles/theme";
import { Script } from "gatsby";

interface SEOProps {
    description: string
    slug: string
    title: string
    appendBusinessNameToTitle?: boolean
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
    const siteURL = siteMetadata.url;
    const twitterHandle = siteMetadata.twitter;

    const pageTitle = props.title ?
        (props.title + (appendBusinessNameToTitle ? ` | ${siteTitle}` : "")) :
        siteTitle;
    const socialImage = props.image ? siteURL + props.image : `${siteURL}/assets/favicon/favicon-300x300.png`;

    return (
        <>
            <meta name="google-site-verification" content="AJxvzTXiJ6uf53Wmy2F6q-aoLvLGVCjDsHWfTU4Mhkg" />
            <Script async src="https://www.googletagmanager.com/gtag/js?id=G-9XCDLT1NCL"></Script>
            <Script id={"gtag"} dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-9XCDLT1NCL');` }} />

            {/* Facebook Pixel Code */}
            <Script dangerouslySetInnerHTML={{
                __html: `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
 fbq('init', '856080292125355'); 
fbq('track', 'PageView');`}} />
            <noscript>
                <img height="1" width="1"
                    src="https://www.facebook.com/tr?id=856080292125355&ev=PageView
&noscript=1"/>
            </noscript>


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