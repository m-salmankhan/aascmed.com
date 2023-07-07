import {useSiteMetadata} from "../../hooks/useSiteMetadata";
import React, {ReactNode} from "react";
import {colours} from "../../styles/theme";

interface SEOProps {
    description: string
    slug: string
    title: string
    language?: string
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
    const siteURL = siteMetadata.url;
    const twitterHandle = siteMetadata.twitter;
    const language = props.language || "en";

    const pageTitle = (props.title ? props.title + " | " : "") + siteTitle;
    const socialImage = props.image ? siteURL + props.image : undefined;

    return (
        <>
            <title>{pageTitle}</title>
            <meta name={"description"} content={props.description} />
            <meta name={"language"} content={language} />
            <Favicons />

            {/* OpenGraph */}
            <meta name={"og:url"} content={siteURL + props.slug} />
            <meta name={"og:title"} content={pageTitle} />
            <meta name={"og:description"} content={props.description} />
            <meta name={"theme-color"} content={colours.brandPrimary} />
            {
                socialImage &&
                <meta name={"og:image"} content={socialImage} />
            }

            {/* Twitter Cards */}
            <meta name={"twitter:card"} content={"summary"}/>
            {
                twitterHandle &&
                <meta name={"twitter:site"} content={twitterHandle} />
            }
            {
                socialImage &&
                <meta name={"twitter:image"} content={socialImage} />
            }
            <meta name={"twitter:description"} content={props.description} />
            {props.children}
        </>
    );

}