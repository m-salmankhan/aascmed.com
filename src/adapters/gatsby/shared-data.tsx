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

/** Query Gatsby site data and provide framework-neutral values to the React tree.
 * @param props Optional React children.
 * @returns Children inside the provider populated from the Gatsby query.
 */
const GatsbySharedDataAdapter: React.FC<{ children?: ReactNode }> = ({ children }) => {
  const data = useStaticQuery<Queries.GatsbySharedSiteDataQuery>(GatsbySharedDataQuery);
  const siteSettings = mapGatsbySiteSettings(data.site?.siteMetadata || {});
  const value: SiteData = {
    siteSettings,
    trackingSettings: mapGatsbyTrackingSettings(data.strapiTrackingInfo),
    announcement: mapGatsbyAnnouncement(data.strapiAnnouncement),
    clinicOptions: data.allStrapiClinic?.clinics?.flatMap(({ clinic_name }) => clinic_name ? [clinic_name] : []) ?? [],
  };

  return <SiteDataProvider value={value}>{children}</SiteDataProvider>;
};

export default GatsbySharedDataAdapter;
