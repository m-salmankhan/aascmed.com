// Hydrates the shared ClinicView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ClinicView } from '../../../../src/views/clinic';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ClinicPageProps = PageContextProps & ComponentProps<typeof ClinicView>;

/** Render the clinic details within the shared site providers.
 * @param props Normalized clinic record, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ClinicPage({ pathname, announcement, ...props }: ClinicPageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ClinicView {...props} />
    </ReactPage>
  );
}
