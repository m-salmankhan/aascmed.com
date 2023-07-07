import {graphql, useStaticQuery} from "gatsby";

export const useSiteMetadata = () => {
    const data: Queries.SiteTitleQuery = useStaticQuery(graphql`
        query SiteTitle {
          site {
            siteMetadata {
              title
              siteUrl
              twitterHandle
            }
          }
        }
      `);

    return {
        title: data.site?.siteMetadata?.title || "Untitled Site",
        url: data.site?.siteMetadata?.siteUrl || "",
        twitter: data.site?.siteMetadata?.twitterHandle,
    };
}