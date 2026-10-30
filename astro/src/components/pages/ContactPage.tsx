// Hydrates the shared ContactView and its site contexts as one React tree.
import type { ComponentProps } from 'react';
import { ContactView } from '../../../../src/views/fixed-archive';
import { ReactPage, type PageContextProps } from '../ReactPage';

type ContactPageProps = PageContextProps & ComponentProps<typeof ContactView>;

/** Render the contact form and clinic choices within the shared site providers.
 * @param props Contact copy, clinic summaries and choices, pathname and optional announcement.
 * @returns One React tree for server rendering and browser hydration.
 */
export function ContactPage({ pathname, announcement, ...props }: ContactPageProps) {
  return (
    <ReactPage pathname={pathname} announcement={announcement}>
      <ContactView {...props} />
    </ReactPage>
  );
}
