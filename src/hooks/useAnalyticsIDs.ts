import { useSiteData } from "../shared/data/site-data";

export const useAnalyticsIDs = () => {
    const { trackingSettings } = useSiteData();

    return {
        googleAnalyticsID: trackingSettings.googleAnalyticsId,
        googleTagManagerID: trackingSettings.googleTagManagerId,
        pixelID: trackingSettings.pixelId,
    };
}
