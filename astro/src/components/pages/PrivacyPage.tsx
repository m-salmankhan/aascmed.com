// Hydrates the shared PrivacyView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { PrivacyView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

type PrivacyPageProps = PageContextProps & ComponentProps<typeof PrivacyView>;

/** Render the privacy policy within the shared site providers.
 * @param props Policy heading, blocks and update date, pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function PrivacyPage({ pathname, announcement, ...props }: PrivacyPageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <PrivacyView {...props} />
    </ReactPage>
  );
}
