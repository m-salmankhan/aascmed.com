import React from 'react';
import { Global } from '@emotion/react';
import { stylesGlobal } from '../styles/global';
import AnnouncementBanner from '../components/AnnouncementBanner';
import { ZocDoc } from '../components/zocdoc';
import { AstroSiteDataProvider } from './astro-site-data';
import { HomeView, type HomeViewProps } from './home';
import type { SiteData } from '../shared/data/site-data';

/** Keep the existing homepage's provider, global style, notice and booking behavior in one hydrated tree. */
export function AstroHomePage({ viewProps, siteData }: { viewProps: HomeViewProps; siteData: SiteData }) {
  return <AstroSiteDataProvider pathname="/" siteData={siteData}>
    <Global styles={stylesGlobal} />
    <AnnouncementBanner />
    <HomeView {...viewProps} />
    <ZocDoc />
  </AstroSiteDataProvider>;
}
