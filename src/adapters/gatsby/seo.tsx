import React from "react";
import { graphql, useStaticQuery } from "gatsby";
import { mapGatsbySiteSettings, mapGatsbyTrackingSettings } from "../../shared/content/gatsby-adapter";
import { SEO } from "../../components/seo";

const GatsbySEODataQuery = graphql`
  query GatsbySEOAdapter {
    site {
      siteMetadata {
        title
        siteUrl
        twitterHandle
      }
    }
    strapiTrackingInfo {
      googleAnalyticsId
      googleTagManagerId
      pixelId
    }
  }
`;

/** Read Gatsby metadata and pass normalized settings to the shared SEO view.
 * @param props SEO display props other than framework-provided site and tracking settings.
 * @returns The shared SEO component with data from Gatsby queries.
 */
export function GatsbySEO(props: Omit<React.ComponentProps<typeof SEO>, "siteSettings" | "trackingSettings">): React.ReactElement {
  const data = useStaticQuery<Queries.GatsbySEOAdapterQuery>(GatsbySEODataQuery);

  return (
    <SEO
      {...props}
      siteSettings={mapGatsbySiteSettings(data.site?.siteMetadata || {})}
      trackingSettings={mapGatsbyTrackingSettings(data.strapiTrackingInfo)}
    />
  );
}
