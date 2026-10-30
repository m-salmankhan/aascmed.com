// Hydrates the shared BlogArchiveView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { BlogArchiveView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

type BlogArchivePageProps = PageContextProps & ComponentProps<typeof BlogArchiveView>;

/** Render the blog archive within the shared site providers.
 * @param props Archive copy and blog summaries, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function BlogArchivePage({ pathname, announcement, ...props }: BlogArchivePageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <BlogArchiveView {...props} />
    </ReactPage>
  );
}
