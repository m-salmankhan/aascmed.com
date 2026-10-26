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

interface GatsbySEOAdapterQuery {
  site?: { siteMetadata?: { title?: string | null; siteUrl?: string | null; twitterHandle?: string | null } | null } | null;
  strapiTrackingInfo?: { googleAnalyticsId?: string | null; googleTagManagerId?: string | null; pixelId?: string | null } | null;
}

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
