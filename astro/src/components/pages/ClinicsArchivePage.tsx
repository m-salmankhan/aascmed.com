// Hydrates the shared ClinicsArchiveView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ClinicsArchiveView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ClinicsArchivePageProps = PageContextProps & ComponentProps<typeof ClinicsArchiveView>;

/** Render the clinic archive within the shared site providers.
 * @param props Archive copy and clinic summaries, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ClinicsArchivePage({ pathname, announcement, ...props }: ClinicsArchivePageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ClinicsArchiveView {...props} />
    </ReactPage>
  );
}
