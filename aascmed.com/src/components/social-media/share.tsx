import {FaIcons, IconStyles} from "../font-awesome";
import {stylesScreenReaderText} from "../../styles/accessibility";
import React from "react";
import {graphql, useStaticQuery} from "gatsby";
import Color from "color";
import {css} from "@emotion/react";
import {colours} from "../../styles/theme";

enum SocialNetworks {
    facebook = 'facebook',
    twitter = 'twitter',
    whatsapp = 'whatsapp',
    reddit = 'reddit',
    pinterest = 'pinterest',
}

const desaturated = Color(colours.brandPrimary).desaturate(1).toString();

interface SocialButtonProps {
    network: SocialNetworks
    url: string
    title: string
}

const stylesShareSingleButton = css({
    margin: "0 0.1rem",

    "&:first-of-type": {
      marginLeft: "0.5rem",
    },

    svg: {
        width: "1.2rem",
        height: "1.2rem",
        verticalAlign: "middle",
        fill: desaturated,
    },

    "&:hover, &:focus, &:active": {
    outline: "none",
    border: "none",
    svg: {
        background: colours.infoBlue,
        fill: colours.infoYellow,
        border: `1px solid {$info-blue}`,
        borderRadius: "3px",
    },
}

});

interface SocialButtonProps {
    network: SocialNetworks,
    url: string,
    title: string
}
const SocialButton: React.FC<SocialButtonProps> = ({network, url, title}) => {
    switch(network) {
        case SocialNetworks.facebook:
            return(
                <a title="Facebook" target="_BLANK" rel="noreferrer" css={stylesShareSingleButton} href={`https://www.facebook.com/sharer/sharer.php?u=${ encodeURIComponent(url) }`}>
                    <FaIcons iconStyle={IconStyles.BRANDS} icon="square-facebook" />
                    <span css={stylesScreenReaderText}>Facebook</span>
                </a>
            );
        case SocialNetworks.twitter:
            return(
                <a title="Twitter" target="_BLANK" rel="noreferrer" css={stylesShareSingleButton} href={`https://twitter.com/intent/tweet/?text=${ encodeURIComponent(`Take a look at ${title} on Allergy, Asthma and Sinus Centers ${url}`)}` }>
                    <FaIcons iconStyle={IconStyles.BRANDS} icon="square-twitter" />
                    <span css={stylesScreenReaderText}>Twitter</span>
                </a>
            );
        case SocialNetworks.whatsapp:
            return(
                <a title="Whatsapp" target="_BLANK" rel="noreferrer" css={stylesShareSingleButton} href={`https://wa.me/?text=${ encodeURIComponent(`Take a look at ${title} on Allergy, Asthma and Sinus Centers ${url}`)}` }>
                    <FaIcons iconStyle={IconStyles.BRANDS} icon="square-whatsapp" />
                    <span css={stylesScreenReaderText}>Whatsapp</span>
                </a>
            );
        case SocialNetworks.reddit:
            return(
                <a title="Reddit" target="_BLANK" rel="noreferrer" css={stylesShareSingleButton} href={`https://www.reddit.com/submit/?url=${ encodeURIComponent(url) }`}>
                    <FaIcons iconStyle={IconStyles.BRANDS} icon="square-reddit" />
                    <span css={stylesScreenReaderText}>Reddit</span>
                </a>
            );
        case SocialNetworks.pinterest:
            return(
                <a title="Pinterest" target="_BLANK" rel="noreferrer" css={stylesShareSingleButton} href={`https://www.pinterest.com/pin/create/button/?url=${ encodeURIComponent(url) }`}>
                    <FaIcons iconStyle={IconStyles.BRANDS} icon="square-pinterest" />
                    <span css={stylesScreenReaderText}>Facebook</span>
                </a>
            );

    }
}

const stylesShareButtons = css({
    color: desaturated,
    fontWeight: "bold",
});

interface ShareToSocialsProps {
    className?: string
    pageTitle: string
    path: string,
}
export const ShareButtons: React.FC<ShareToSocialsProps> = ({pageTitle, path, className}) => {
    const data: Queries.siteURLQuery = useStaticQuery(graphql`
        query siteURL {
            site {
                siteMetadata {
                    siteUrl
                }
            }
        }
    `);

    const baseURL = ((!!data.site?.siteMetadata) ? data.site.siteMetadata.siteUrl : "") as string;
    const url = baseURL + path;

    return (
        <aside className={className} css={stylesShareButtons}>
            Share on:
            <SocialButton title={pageTitle} url={url} network={SocialNetworks.whatsapp} />
            <SocialButton title={pageTitle} url={url} network={SocialNetworks.facebook} />
            <SocialButton title={pageTitle} url={url} network={SocialNetworks.twitter} />
            <SocialButton title={pageTitle} url={url} network={SocialNetworks.reddit} />
            <SocialButton title={pageTitle} url={url} network={SocialNetworks.pinterest} />
        </aside>
    );
}

