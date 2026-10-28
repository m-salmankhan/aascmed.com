import { useSiteData } from "../shared/data/site-data";

export const useSiteMetadata = () => {
    const { siteSettings } = useSiteData();

    return {
        title: siteSettings.title || "Untitled Site",
        url: siteSettings.url || "",
        twitter: siteSettings.twitterHandle,
    };
}
