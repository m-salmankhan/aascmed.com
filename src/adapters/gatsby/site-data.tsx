import React, { ReactNode } from "react";
import { graphql, useStaticQuery } from "gatsby";
import { mapGatsbySiteSettings } from "../../shared/content/gatsby-adapter";
import { SiteData, SiteDataProvider } from "../../shared/data/site-data";

const GatsbySiteDataQuery = graphql`
  query GatsbySiteData {
    site {
      siteMetadata {
        title
        siteUrl
        twitterHandle
      }
    }
  }
`;

/** Query Gatsby site metadata for the React tree.
 * @param children Optional React children.
 * @returns Children inside the provider populated from the Gatsby query.
 */
function GatsbySiteDataAdapter({ children }: { children?: ReactNode }): React.ReactElement {
  const data = useStaticQuery<Queries.GatsbySiteDataQuery>(GatsbySiteDataQuery);
  const siteSettings = mapGatsbySiteSettings(data.site?.siteMetadata || {});
  const value: SiteData = { siteSettings };

  return <SiteDataProvider value={value}>{children}</SiteDataProvider>;
}

export default GatsbySiteDataAdapter;
