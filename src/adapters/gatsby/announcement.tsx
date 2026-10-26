import React from "react";
import { graphql, useStaticQuery } from "gatsby";
import { mapGatsbyAnnouncement } from "../../shared/content/gatsby-adapter";
import AnnouncementBanner from "../../components/AnnouncementBanner";

const GatsbyAnnouncementBannerQuery = graphql`
  query GatsbyAnnouncementBanner {
    strapiAnnouncement {
      enabled
      type
      internal {
        content
      }
    }
  }
`;

/** Fetch and normalize announcement data at the Gatsby boundary for the shared banner.
 * @returns The banner with announcement settings from the Gatsby query.
 */
function GatsbyAnnouncementAdapter(): React.ReactElement {
  const data = useStaticQuery<Queries.GatsbyAnnouncementBannerQuery>(GatsbyAnnouncementBannerQuery);
  return <AnnouncementBanner announcement={mapGatsbyAnnouncement(data.strapiAnnouncement)} />;
}

export default GatsbyAnnouncementAdapter;
