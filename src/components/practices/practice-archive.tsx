import React, { useEffect, useRef, useState } from "react";
import { H1, H2, H3, SectionHeader, stylesBigH1, stylesH1 } from "../headings";
import { css } from "@emotion/react";
import ReactMarkdown from "react-markdown";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { Container } from "../containers";
import { Link } from "gatsby";
import { Thumbnail } from "../thumbnails";
import { IconStyles } from "../font-awesome";
import { MapBoxProps } from "../mapbox";
import { gridSpacing } from "../../styles/theme";

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
    cols(6, mediaBreakpoints.md),
    cols(3, mediaBreakpoints.lg),
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
const PracticeArchiveListItem: React.FC<PracticeListItemProps> = ({ className, practice, inView, isFrontPage }) => {
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
    lazyLoad?: boolean,
    practices: [PracticeSummary]
}
export const PracticeArchiveList: React.FC<PracticeArchiveListProps> = (props) => {
    const lazyLoad = props.lazyLoad || false;
    const [inView, setInView] = useState(!lazyLoad);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const componentRef = useRef<HTMLUListElement | null>(null);

    useEffect(() => {
        if (!lazyLoad) return;
        if (componentRef.current === null) return;
        if (observerRef.current !== null) return;

        const observer = new IntersectionObserver((entries, observer) => {
            if (entries[0].isIntersecting) {
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

interface PracticeArchiveProps {
    className?: string,
    practices: PracticeSummary[],
    heading: string,
    text: string,
    lazyLoad?: boolean,
    isHomePage: boolean
}
export const PracticeArchive: React.FC<PracticeArchiveProps> = ({ className, practices, heading, text, isHomePage, lazyLoad }) => {
    if (practices.length === 0) return <></>;

    return (
        <section className={className}>
            <SectionHeader
                heading={
                    isHomePage ?
                        <h2 css={stylesBigH1}>{heading}</h2> :
                        <h1 css={stylesBigH1}>{heading}</h1>
                }
                bodyText={text}
            />
            <PracticeArchiveList practices={practices as [PracticeSummary]} lazyLoad={lazyLoad} />
        </section>
    );
}