// Hydrates the shared ServiceUpdateView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ServiceUpdateView } from '../../../../src/views/service-update';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ServiceUpdatePageProps = PageContextProps & ComponentProps<typeof ServiceUpdateView>;

/** Render the service update within the shared site providers.
 * @param props Normalized service update, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ServiceUpdatePage({ pathname, announcement, ...props }: ServiceUpdatePageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ServiceUpdateView {...props} pathname={pathname} />
    </ReactPage>
  );
}
