// Hydrates the shared ProvidersArchiveView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ProvidersArchiveView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ProvidersArchivePageProps = PageContextProps & ComponentProps<typeof ProvidersArchiveView>;

/** Render the provider archive within the shared site providers.
 * @param props Archive copy and provider summaries, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ProvidersArchivePage({
  pathname,
  announcement,
  ...props
}: ProvidersArchivePageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ProvidersArchiveView {...props} />
    </ReactPage>
  );
}
