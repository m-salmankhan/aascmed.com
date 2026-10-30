// Hydrates the shared NotFoundView and its site contexts as one React tree.
import { NotFoundView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

/** Render the not-found message within the shared site providers.
 * @param props Current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function NotFoundPage({ pathname, announcement }: PageContextProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <NotFoundView />
    </ReactPage>
  );
}
