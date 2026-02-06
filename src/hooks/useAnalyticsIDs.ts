import {graphql, useStaticQuery} from "gatsby";

export const useAnalyticsIDs = () => {
    const data: Queries.AnalyticsIDsQuery = useStaticQuery(graphql`
        query AnalyticsIDs {
            strapiTrackingInfo {
                googleAnalyticsId
                googleTagManagerId
                pixelId
            }
        }
      `);

    const trackingInfo = data.strapiTrackingInfo;

    return {
        googleAnalyticsID: trackingInfo?.googleAnalyticsId || "",
        googleTagManagerID: trackingInfo?.googleTagManagerId || "",
        pixelID: trackingInfo?.pixelId || ""
    };
}