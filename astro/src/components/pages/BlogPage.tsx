// Hydrates the shared BlogPostView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { BlogPostView } from '../../../../src/views/blog-post';
import { ReactPage, type PageContextProps } from '../ReactPage';

type BlogPageProps = PageContextProps & ComponentProps<typeof BlogPostView>;

/** Render the blog article within the shared site providers.
 * @param props Normalized blog record, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function BlogPage({ pathname, announcement, ...props }: BlogPageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <BlogPostView {...props} pathname={pathname} />
    </ReactPage>
  );
}
