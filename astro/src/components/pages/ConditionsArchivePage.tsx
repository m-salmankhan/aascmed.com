// Hydrates the shared ConditionsArchiveView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ConditionsArchiveView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ConditionsArchivePageProps = PageContextProps & ComponentProps<typeof ConditionsArchiveView>;

/** Render the condition archive within the shared site providers.
 * @param props Archive copy and condition summaries, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ConditionsArchivePage({
  pathname,
  announcement,
  ...props
}: ConditionsArchivePageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ConditionsArchiveView {...props} />
    </ReactPage>
  );
}
