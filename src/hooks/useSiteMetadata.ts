import {graphql, useStaticQuery} from "gatsby";

export const useSiteMetadata = () => {
    const data = useStaticQuery(graphql`
        query SiteTitle {
          site {
            siteMetadata {
              title
              siteUrl
            }
          }
        }
      `);

    return {
        title: data.site.siteMetadata.title,
        url: data.site.siteMetadata.siteUrl,
    };
}