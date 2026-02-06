import React from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import { ErrorNotice } from './forms/notices';
import { SuccessNotice } from './forms/notices';
import { InfoNotice } from './forms/notices';
import { css } from '@emotion/react';
import { StrapiBlocksRenderer } from './strapi/blocks-renderer';

type NoticeType = 'error' | 'info' | 'success';

interface Notice {
    enabled: boolean;
    type: NoticeType;
    message: any[] | null;
}


function validateNoticeType(noticeTypeStr: string | null): NoticeType {
    if (noticeTypeStr === 'error' || noticeTypeStr === 'info' || noticeTypeStr === 'success') {
        return noticeTypeStr;
    }
    return 'info';
}

function parseAnnouncementQueryResponse(response: Queries.AnnouncementQuery): Notice {
    const announcement = response.strapiAnnouncement;
    
    if (!announcement) {
        return {
            enabled: false,
            type: "info",
            message: null,
        }
    }

    const enabled = !!announcement.enabled;
    const type = validateNoticeType(announcement.type);
    
    // Parse the message from internal.content
    const rawContent = announcement.internal?.content;
    const parsedData = rawContent ? JSON.parse(rawContent) : null;
    const message = parsedData?.message as any[] | null;

    return {
        enabled,
        type,
        message,
    }
}



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

interface AnnnouncementProps {
  className?: string
}

const AnnouncementBanner = ({className}: AnnnouncementProps) => {
    const data: Queries.AnnouncementQuery = useStaticQuery(graphql`
        query Announcement {
            strapiAnnouncement {
                enabled
                type
                internal {
                    content
                }
            }
        }
    `);
    const announcement: Notice = parseAnnouncementQueryResponse(data);
    
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
