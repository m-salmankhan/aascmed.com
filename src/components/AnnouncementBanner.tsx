import React from 'react';
import { ErrorNotice } from './forms/notices';
import { SuccessNotice } from './forms/notices';
import { InfoNotice } from './forms/notices';
import { css } from '@emotion/react';
import { StrapiBlocksRenderer } from './strapi/blocks-renderer';
import type { AnnouncementSettings } from '../shared/content/models';

const dismissKey = "announcementDismissed"
const onDismiss = () => {
    window.sessionStorage.setItem(dismissKey, "true");
}

function wasDismissed(): boolean {
    if(typeof window == "undefined") return false;
    return window.sessionStorage.getItem(dismissKey) === "true";
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

const AnnouncementBanner = ({ announcement, className }: AnnouncementBannerProps) => {
    if (!announcement.enabled || wasDismissed()) {
        return <></>;
    }

    const components = {
        "info": InfoNotice,
        "success": SuccessNotice,
        "error": ErrorNotice
    }
    const Component = components[announcement.type]

    return (
        <aside className={className}>
            <Component css={announcementStyles} onDismiss={onDismiss} transitionType='shrinkUp'>
                {announcement.message && <StrapiBlocksRenderer content={announcement.message} />}
            </Component>
        </aside>
    );
};

export default AnnouncementBanner;
