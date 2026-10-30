// Supplies the shared site contexts and announcement around a React page tree.
import type { ReactNode } from 'react';
import AnnouncementBanner from '../../../src/components/AnnouncementBanner';
import { CurrentPathProvider } from '../../../src/shared/navigation/current-path';
import { PublicConfigProvider } from '../../../src/shared/config/public-context';
import { SiteDataProvider } from '../../../src/shared/data/site-data';
import type { AnnouncementSettings } from '../../../src/shared/content/models';
import { astroPublicConfig } from '../config/public';
import { siteSettings } from '../config/site';

/** Public request-specific context needed by a hydrated page. */
export interface PageContextProps {
  pathname: string;
  announcement: AnnouncementSettings | null;
}

/** A React child tree rendered inside the common site providers. */
interface ReactPageProps extends PageContextProps {
  children: ReactNode;
}

/** Render a page tree with the same public contexts used by Gatsby.
 * @param props Page children, current pathname and optional announcement.
 * @returns The children and optional banner inside the shared providers.
 */
export function ReactPage({ pathname, announcement, children }: ReactPageProps) {
  return (
    <PublicConfigProvider value={astroPublicConfig}>
      <SiteDataProvider value={{ siteSettings }}>
        <CurrentPathProvider path={pathname}>
          {announcement && <AnnouncementBanner announcement={announcement} />}
          {children}
        </CurrentPathProvider>
      </SiteDataProvider>
    </PublicConfigProvider>
  );
}
