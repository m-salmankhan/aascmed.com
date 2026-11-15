import { siteSettings as defaults } from '../config/site';
import { useSiteData } from '../data/site-data';

export const useSiteMetadata = () => {
  const { siteSettings } = useSiteData();

  return {
    title: siteSettings.title || defaults.title,
    url: siteSettings.url || defaults.url,
    twitter: siteSettings.twitterHandle,
  };
};
