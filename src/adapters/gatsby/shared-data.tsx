import React, { ReactNode } from "react";
import { graphql, useStaticQuery } from "gatsby";
import {
  mapGatsbyAnnouncement,
  mapGatsbySiteSettings,
  mapGatsbyTrackingSettings,
} from "../../shared/content/gatsby-adapter";
import { SiteData, SiteDataProvider } from "../../shared/data/site-data";

const GatsbySharedDataQuery = graphql`
  query GatsbySharedSiteData {
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
    strapiAnnouncement {
      enabled
      type
      internal {
        content
      }
    }
    allStrapiClinic {
      clinics: nodes {
        clinic_name
      }
    }
  }
`;

interface GatsbySharedSiteDataQuery {
  site?: { siteMetadata?: { title?: string | null; siteUrl?: string | null; twitterHandle?: string | null } | null } | null;
  strapiTrackingInfo?: { googleAnalyticsId?: string | null; googleTagManagerId?: string | null; pixelId?: string | null } | null;
  strapiAnnouncement?: { enabled?: boolean | null; type?: string | null; internal?: { content?: string | null } | null } | null;
  allStrapiClinic: { clinics: Array<{ clinic_name?: string | null }> };
}

const GatsbySharedDataAdapter: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const data = useStaticQuery<GatsbySharedSiteDataQuery>(GatsbySharedDataQuery);
  const siteSettings = mapGatsbySiteSettings(data.site?.siteMetadata || {});
  const value: SiteData = {
    siteSettings,
    trackingSettings: mapGatsbyTrackingSettings(data.strapiTrackingInfo),
    announcement: mapGatsbyAnnouncement(data.strapiAnnouncement),
    clinicOptions: data.allStrapiClinic.clinics.flatMap(({ clinic_name }) => clinic_name ? [clinic_name] : []),
  };

  return <SiteDataProvider value={value}>{children}</SiteDataProvider>;
};

export default GatsbySharedDataAdapter;
