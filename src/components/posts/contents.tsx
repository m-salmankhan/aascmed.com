import React, { useEffect, useRef, useState } from "react";
import { Link } from "gatsby";
import { colours, gridSpacing } from "../../styles/theme";
import Color from "color";
import { breakpointStrings, mediaBreakpoints } from "../../styles/breakpoints";
import { H2, stylesH1 } from "../headings";

type url = string;
export interface ContentsPageItem {
    title: string,
    url: url,
    items?: ContentsPageItem[],
}
interface ContentsItemProps {
    heading: Heading,
    active: boolean,
    activeIDs: string[],
}

const ContentsItem: React.FC<ContentsItemProps> = ({ heading, active, activeIDs }) => {
    return (
        <li>
            <Link className={active ? "active" : ""} to={heading.url}>{heading.title}</Link>
            {(heading.subHeadings.length > 0) &&
                <ol>
                    {heading.subHeadings.map((subHeading, idx) =>
                        <ContentsItem key={idx} heading={subHeading} active={!!activeIDs.find(id => id === subHeading.url.slice(1))} activeIDs={activeIDs} />
                    )}
                </ol>
            }
        </li>
    );
}

const stylesContents = {
    padding: "1rem",
    paddingBottom: "1rem",
    background: "rgba(0, 0, 0, 0.03)",
    borderTop: `0.25rem solid ${Color(colours.brandPrimary).fade(0.3)}`,
    borderBottom: `0.25rem solid ${Color(colours.brandPrimary).fade(0.3)}`,
    marginBottom: `1.5rem`,
    marginTop: `${gridSpacing}em`,
    position: "sticky",
    top: `${gridSpacing}em`,

    h2: {
        marginTop: "0",
    },

    ol: {
        listStyle: "none",
        margin: 0,
        padding: 0,

        ol: {
            margin: 0,
            paddingLeft: "1em",
        },
        li: {
            margin: `${gridSpacing / 4}em 0`,

            a: {
                textDecoration: "underline",
                color: "black",
                padding: "3px 6px 3px 0",
                display: "inline-block",
                position: "relative",
                transition: `border-left .5s ease 0s,
                    padding-left .5s ease 0s`,

                "&::after": {
                    content: `''`,
                    display: "block",
                    position: "absolute",
                    bottom: "-2.5px",
                    width: 0,
                    height: "2.5px",
                    transition: "width 1s ease 0s",
                },

                "&.active": {
                    borderLeft: `0.5rem solid ${colours.brandPrimary}`,
                    paddingLeft: "1rem",
                },

                "&:focus, &:hover, &:active": {
                    outline: "none",
                    textDecoration: "none",
                    color: colours.brandPrimary,
                    fontWeight: "bold",

                    "&::after": {
                        background: colours.brandPrimary,
                        width: "100%",
                    },
                },
            },
        },
    },
};

stylesContents[breakpointStrings.md] = {
    padding: 0,
    background: "transparent",
    borderTop: "none",
    borderBottom: "none",
    marginBottom: 0,
    marginTop: "-5.4em",
    marginLeft: `2vw`,

    ol: {
        li: {
            a: {
                textDecoration: "none",
            },
        },
    },
}

interface ContentsProps {
    className?: string,
    items: ContentsPageItem[],
}

interface Heading {
    element: Element
    url: string
    title: string
    subHeadings: Heading[]
    active: boolean
}
export const Contents: React.FC<ContentsProps> = ({ className, items }) => {
    const [activeIDs, setActiveIDs] = useState<string[]>([]);
    // Initialise Observer
    const observerRef = useRef<IntersectionObserver | null>(null);
    useEffect(() => {
        const observerOptions: IntersectionObserverInit = {
            threshold: 0.5
        };
        const observerCallback: IntersectionObserverCallback = (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && entry.intersectionRatio > observerOptions.threshold) {
                    setActiveIDs(ids => [...ids, entry.target.id]);
                } else {
                    setActiveIDs(ids => ids.filter(id => id !== entry.target.id));
                }
            })
        };

        if (observerRef.current === null) {
            const observer = new IntersectionObserver(observerCallback, observerOptions);
            observerRef.current = observer;

            return () => {
                observerRef.current = null;
                observer.disconnect();
            }
        }
    }, [observerRef]);

    // Analyse Heading Elements
    const [headingElements, setHeadingElements] = useState<Heading[] | null>(null);
    useEffect(() => {
        if (headingElements === null) {
            function itemsLoop(xs: ContentsPageItem[] | undefined): Heading[] {
                if (!Array.isArray(xs)) return [];

                return xs.flatMap(item => {
                    if (!item) return [];
                    if (typeof item.url === "string" && typeof item.title === "string") {
                        const element = document.getElementById(item.url.slice(1));
                        if (element === null) return [];
                        return [{
                            element,
                            url: item.url,
                            title: item.title,
                            subHeadings: itemsLoop(item.items),
                            active: false,
                        }];
                    } else if (Array.isArray(item.items) && item.items.length > 0) {
                        // Flatten children into this level
                        return itemsLoop(item.items);
                    } else {
                        // Log skipped item
                        console.error("Heading level skipped (no url/title, no children):", item);
                        return [];
                    }
                });
            }

            setHeadingElements(itemsLoop(items));
        }
    }, [headingElements, items]);

    // Observe Heading Elements
    useEffect(() => {
        if (headingElements !== null && observerRef.current !== null) {
            const headings = headingElements as Heading[];
            const observer = observerRef.current as IntersectionObserver;
            const observeHeadings = (xs: Heading[]) => {
                xs.forEach((heading) => {
                    observer.observe(heading.element);
                    observeHeadings(heading.subHeadings);
                });
            }

            observeHeadings(headings);
        }
    }, [headingElements, observerRef]);

    if(!headingElements || headingElements.length == 0) {
        return <></>
    }
    return (
        <section className={className} css={stylesContents}>
            <H2 css={stylesH1}>Contents</H2>
            <ol>
                {headingElements?.map((heading, key) =>
                    <ContentsItem heading={heading} key={key} active={!!activeIDs.find(id => id === heading.url.slice(1))} activeIDs={activeIDs} />
                )}
            </ol>
        </section>
    );
}