import React, {useEffect, useRef, useState} from "react";
import {H1, H2, H3, stylesH1} from "../headings";
import {css} from "@emotion/react";
import ReactMarkdown from "react-markdown";
import {cols, gridContainer} from "../../styles/grid";
import {mediaBreakpoints} from "../../styles/breakpoints";
import {Container} from "../containers";
import {Link} from "gatsby";
import {Thumbnail} from "../thumbnails";
import {IconStyles} from "../font-awesome";
import {MapBoxProps} from "../mapbox";
import {gridSpacing} from "../../styles/theme";

export interface PracticeSummary {
    slug: string,
    clinic_name: string,
    latitude: number,
    longitude: number,
    address: string,
    phone: string,
    fax: string
}

const stylesPracticeArchiveListItem = css(
    cols(12),
    cols(2, mediaBreakpoints.md),
    cols(4, mediaBreakpoints.lg),
    css`
      width: 100%;
      
      address {
        font-style: normal;
        
        p {
          margin: 0;
          white-space: pre-wrap;
        }
      }
      
      .more {
        font-weight: bold;
      }
    `
);

interface PracticeListItemProps {
    className?: string,
    inView?: boolean,
    isFrontPage?: boolean,
    practice: PracticeSummary
}
const PracticeArchiveListItem: React.FC<PracticeListItemProps> = ({className, practice, inView, isFrontPage}) => {
    const staticMapProps: MapBoxProps = {
        longitude: practice.longitude,
        latitude: practice.latitude,
        label: practice.clinic_name,
        zoom: 16,
        inView: inView
    }
    return (
        <li className={className} css={stylesPracticeArchiveListItem}>
            <Link to={practice.slug}>
                <Thumbnail overlayIcon={"house-medical"}
                           overlayIconStyle={IconStyles.SOLID}
                           mapboxStaticMap={staticMapProps}
                           css={css`height: 15rem`}
                />
            </Link>
            {
                isFrontPage ?
                    <H3>{practice.clinic_name}</H3> :
                    <H2>{practice.clinic_name}</H2>
            }

            <address>
                <p>{practice.address}</p>
                <p>Ph: <a href={`tel:${practice.phone}`}>{practice.phone}</a></p>
                <p>Fax: <a href={`fax:${practice.fax}`}>{practice.fax}</a></p>
            </address>
            <p className={"more"}>
                <Link to={practice.slug}>View opening times</Link>
            </p>
        </li>
    )
}

const stylesPracticeArchiveList = css(
    gridContainer(),
    css`
      list-style: none;
      margin: 0;
      padding: 0;
    `
);
interface PracticeArchiveListProps {
    className?: string,
    practices: [PracticeSummary]
}
export const PracticeArchiveList: React.FC<PracticeArchiveListProps> = (props) => {
    const [inView, setInView] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const componentRef = useRef<HTMLUListElement | null>(null);

    useEffect(() => {
        if(componentRef.current === null) return;
        if(observerRef.current !== null) return;

        const observer = new IntersectionObserver((entries, observer) => {
            if(entries[0].isIntersecting) {
                setInView(true);
                observer.unobserve(entries[0].target);
            }
        });

        observerRef.current = observer;
        observer.observe(componentRef.current);

    }, [observerRef, componentRef, setInView]);

    return (
        <ul className={props.className} ref={componentRef} css={stylesPracticeArchiveList}>
            {
                props.practices.map((practice, idx) =>
                    <PracticeArchiveListItem practice={practice} key={idx} inView={inView} />
                )
            }
        </ul>
    )
}

const stylesTextWrapper = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
);

const stylesHeading = css(
    cols(12),
    cols(9, mediaBreakpoints.lg),
    {
        padding: 0,
        fontSize: "2.5rem",
        "@media screen": {
            padding: 0,
        }
    }
);

interface PracticeArchiveProps {
    className?: string,
    practices: PracticeSummary[],
    heading: string,
    text: string,
    isHomePage: boolean
}
export const PracticeArchive: React.FC<PracticeArchiveProps> = ({className, practices, heading, text, isHomePage}) => {
    if(practices.length === 0) return <></>;

    return (
        <section className={className}>
            <div css={stylesTextWrapper}>
                {
                    isHomePage ?
                        <H2 css={css(stylesH1, stylesHeading)}>{heading}</H2> :
                        <H1 css={css(stylesH1, stylesHeading)}>{heading}</H1>
                }
                {
                    text &&
                    <ReactMarkdown>
                        {text}
                    </ReactMarkdown>
                }
            </div>
            <PracticeArchiveList practices={practices as [PracticeSummary]} />
        </section>
    );
}