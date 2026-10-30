// Hydrates the shared ProviderView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ProviderView } from '../../../../src/views/provider';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ProviderPageProps = PageContextProps & ComponentProps<typeof ProviderView>;

/** Render the provider profile within the shared site providers.
 * @param props Normalized provider record, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ProviderPage({ pathname, announcement, ...props }: ProviderPageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ProviderView {...props} pathname={pathname} />
    </ReactPage>
  );
}
