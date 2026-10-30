// Renders the shared announcement with hydration-safe session dismissal.
import React, { useEffect, useState } from 'react';
import { ErrorNotice } from './forms/notices';
import { SuccessNotice } from './forms/notices';
import { InfoNotice } from './forms/notices';
import { css } from '@emotion/react';
import { StrapiBlocksRenderer } from './strapi/blocks-renderer';
import type { AnnouncementSettings } from '../shared/content/models';

const dismissKey = 'announcementDismissed';

/** Read dismissal state after hydration without breaking SSR or restricted storage.
 * @returns Whether this browser session previously dismissed the announcement.
 */
function wasDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(dismissKey) === 'true';
  } catch {
    return false;
  }
}

const announcementStyles = css`
  animation: none;
  border: none;
  border-radius: 0;
`;

interface AnnouncementBannerProps {
  announcement: AnnouncementSettings;
  className?: string;
}

/** Render the announcement with deterministic server/initial-client markup.
 * @param props Normalized public announcement content and optional styling class.
 * @returns A dismissible notice, or no markup after it is disabled or dismissed.
 */
const AnnouncementBanner = ({ announcement, className }: AnnouncementBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    setDismissed(wasDismissed());
  }, []);

  /** Persist dismissal when storage is available and update the current React tree.
   * @returns Nothing; storage failures do not prevent closing the notice.
   */
  function onDismiss(): void {
    try {
      window.sessionStorage.setItem(dismissKey, 'true');
    } catch {
      // The notice remains dismissible when browser storage is unavailable.
    }
    setDismissed(true);
  }

  if (!announcement.enabled || dismissed) {
    return <></>;
  }

  const components = {
    info: InfoNotice,
    success: SuccessNotice,
    error: ErrorNotice,
  };
  const Component = components[announcement.type];

  return (
    <aside className={className}>
      <Component css={announcementStyles} onDismiss={onDismiss} transitionType="shrinkUp">
        {announcement.message && <StrapiBlocksRenderer content={announcement.message} />}
      </Component>
    </aside>
  );
};

export default AnnouncementBanner;
