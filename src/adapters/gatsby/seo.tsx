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

/** Nullable GraphQL shape for the site and tracking fields consumed by the SEO adapter. */
interface GatsbySEOAdapterQuery {
  site?: { siteMetadata?: { title?: string | null; siteUrl?: string | null; twitterHandle?: string | null } | null } | null;
  strapiTrackingInfo?: { googleAnalyticsId?: string | null; googleTagManagerId?: string | null; pixelId?: string | null } | null;
}

/** Read Gatsby metadata and pass normalized settings to the shared SEO view.
 * @param props SEO display props other than framework-provided site and tracking settings.
 * @returns The shared SEO component with data from Gatsby queries.
 */
export const GatsbySEO: React.FC<Omit<React.ComponentProps<typeof SEO>, "siteSettings" | "trackingSettings">> = (props) => {
  const data = useStaticQuery<GatsbySEOAdapterQuery>(GatsbySEODataQuery);

  return (
    <SEO
      {...props}
      siteSettings={mapGatsbySiteSettings(data.site?.siteMetadata || {})}
      trackingSettings={mapGatsbyTrackingSettings(data.strapiTrackingInfo)}
    />
  );
};
