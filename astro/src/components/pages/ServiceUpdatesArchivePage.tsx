// Hydrates the shared ServiceUpdatesArchiveView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ServiceUpdatesArchiveView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ServiceUpdatesArchivePageProps = PageContextProps &
  ComponentProps<typeof ServiceUpdatesArchiveView>;

/** Render the service-update archive within the shared site providers.
 * @param props Archive copy and update summaries, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ServiceUpdatesArchivePage({
  pathname,
  announcement,
  ...props
}: ServiceUpdatesArchivePageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ServiceUpdatesArchiveView {...props} />
    </ReactPage>
  );
}
