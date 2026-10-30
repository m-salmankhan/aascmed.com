// Renders shared React views with their framework-neutral site contexts.
import React, { type ComponentProps } from 'react';
import AnnouncementBanner from '../../../src/components/AnnouncementBanner';
import { ContactView, NotFoundView, PrivacyView } from '../../../src/views/fixed-archive';
import { CurrentPathProvider } from '../../../src/shared/navigation/current-path';
import { PublicConfigProvider } from '../../../src/shared/config/public-context';
import { SiteDataProvider } from '../../../src/shared/data/site-data';
import type { PublicConfig } from '../../../src/shared/config/public';
import type { AnnouncementSettings, SiteSettings } from '../../../src/shared/content/models';

/** Serializable view selection and its corresponding shared-view inputs. */
export type PageView =
  | { kind: 'not-found' }
  | { kind: 'privacy'; props: ComponentProps<typeof PrivacyView> }
  | { kind: 'contact'; props: ComponentProps<typeof ContactView> };

/** Values needed by the shared page tree, excluding server-only CMS credentials. */
export interface ReactPageProps {
  pathname: string;
  view: PageView;
  siteSettings: SiteSettings;
  publicConfig: PublicConfig;
  announcement: AnnouncementSettings | null;
}

/** Render one selected shared view with the same site-wide contexts used by Gatsby.
 * @param props Serializable page selection, public settings, pathname and announcement.
 * @returns The selected view and optional banner inside the shared providers.
 */
export function ReactPage({
  pathname,
  view,
  siteSettings,
  publicConfig,
  announcement,
}: ReactPageProps) {
  let content: React.ReactNode;
  switch (view.kind) {
    case 'not-found':
      content = <NotFoundView />;
      break;
    case 'privacy':
      content = <PrivacyView {...view.props} />;
      break;
    case 'contact':
      content = <ContactView {...view.props} />;
      break;
  }
  return (
    <PublicConfigProvider value={publicConfig}>
      <SiteDataProvider value={{ siteSettings }}>
        <CurrentPathProvider path={pathname}>
          {announcement && <AnnouncementBanner announcement={announcement} />}
          {content}
        </CurrentPathProvider>
      </SiteDataProvider>
    </PublicConfigProvider>
  );
}
