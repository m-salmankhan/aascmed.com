import {graphql, useStaticQuery} from "gatsby";

export const useAnalyticsIDs = () => {
    const data: Queries.AnalyticsIDsQuery = useStaticQuery(graphql`
        query AnalyticsIDs {
            ids: file(relativePath: {eq: "pages/tracking.yml"}) {
                childrenPagesYaml {
                    google_analytics_id
                    google_tag_manager_id
                    pixel_id
                }
            }
        }
      `);

    if(data.ids?.childrenPagesYaml === null) {
        return {
            googleAnalyticsID: "",
            googleTagManagerID: "",
            pixelID: ""
        }
    }

    return {
        googleAnalyticsID: data.ids?.childrenPagesYaml[0]?.google_analytics_id,
        googleTagManagerID: data.ids?.childrenPagesYaml[0]?.google_tag_manager_id,
        pixelID: data.ids?.childrenPagesYaml[0]?.google_analytics_id
    };
}