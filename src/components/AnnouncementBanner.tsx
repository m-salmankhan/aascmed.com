import React from 'react';
import { useStaticQuery, graphql } from 'gatsby';
import { ErrorNotice } from './forms/notices';
import { SuccessNotice } from './forms/notices';
import { InfoNotice } from './forms/notices';
import { css } from '@emotion/react';
import ReactMarkdown from 'react-markdown';

type NoticeType = 'error' | 'info' | 'success';

interface Notice {
    enabled: boolean;
    type: NoticeType;
    message: string;
}


function validateNoticeType(noticeTypeStr: string | null): NoticeType {
    if (noticeTypeStr === 'error' || noticeTypeStr === 'info' || noticeTypeStr === 'success') {
        return noticeTypeStr;
    }
    return 'info';
}

function parseAnnouncementQueryResponse(response: Queries.AnnouncementQuery): Notice {
    if (
        response.file?.announcement === null ||
        typeof(response.file?.announcement[0]) == "undefined" ||
        response.file.announcement[0] === null
    ) {
        return {
            enabled: false,
            type: "info",
            message: "",
        }
    }

    const sanitizedResponse = response.file.announcement[0];

    const enabled = !!sanitizedResponse.enabled;
    const type = validateNoticeType(sanitizedResponse.type) 
    const message = sanitizedResponse.message || "";

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
    return window.sessionStorage.getItem(dismissKey) === "true"
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
            file(relativePath: {eq: "pages/announcement.yml"}) {
                announcement: childrenPagesYaml {
                    enabled
                    type
                    message
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
                <ReactMarkdown>
                    {announcement.message}
                </ReactMarkdown>
            </Component>
        </aside>
    );
};

export default AnnouncementBanner;
