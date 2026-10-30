// Hydrates the shared HomeView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { HomeView } from '../../../../src/views/home';
import { App } from '../../../../src/components/layouts/app';
import { ReactPage, type PageContextProps } from '../ReactPage';

type HomePageProps = PageContextProps & ComponentProps<typeof HomeView>;

/** Render the homepage sections within the shared site providers.
 * @param props Normalized homepage sections, current pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function HomePage({ pathname, announcement, ...props }: HomePageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <App>
        <HomeView {...props} />
      </App>
    </ReactPage>
  );
}
