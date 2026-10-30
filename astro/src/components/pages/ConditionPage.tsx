// Hydrates the shared ConditionView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ConditionView } from '../../../../src/views/condition';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ConditionPageProps = PageContextProps & ComponentProps<typeof ConditionView>;

/** Render the condition article within the shared site providers.
 * @param props Normalized condition record, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ConditionPage({ pathname, announcement, ...props }: ConditionPageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ConditionView {...props} pathname={pathname} />
    </ReactPage>
  );
}
