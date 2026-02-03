import { H2, H3, SectionHeader, stylesBigH1, stylesH4 } from "../headings";
import { css } from "@emotion/react";
import React from "react";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { Link } from "gatsby";
import { bounceTransition, colours, gridSpacing } from "../../styles/theme";
import Color from "color";
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image";

export interface BlogSummary {
    slug: string,
    date: string,
    title: string,
    description: string,
    thumbnail?: IGatsbyImageData,
}

interface BlogListProps {
    className?: string
    Blogs: [BlogSummary]
    frontPage: boolean
}

const stylesList = css(
    gridContainer(),
    {
        listStyle: "none",
        padding: 0,
        margin: 0,
    }
);
const stylesLi = css(
    cols(12),
    cols(6, mediaBreakpoints.md),
    cols(4, mediaBreakpoints.lg),
    {
        margin: "1em 0 1em",

        ".thumbnail": {
            display: "block",
            width: "100%",
            height: "15em",
            borderRadius: "8px",
            boxShadow: "-0.5em 0.5em 1em rgba(0,0,0,0.1)",
            overflow: "hidden",
            position: "relative",
            marginBottom: `${gridSpacing/2}em`,
            transform: `scale(1)`,
            transition: `transform 1s ${bounceTransition} 0s`,


            ".gatsby-image-wrapper": {
                width: "100%",
                height: "100%",
            },
        },

        ".thumbnail::after": {
            display: "block",
            content: "''",
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: `linear-gradient(to top right, ${Color(colours.brandPrimary).darken(0.3).fade(0.1).toString()}, ${Color(colours.brandSecondary).darken(0.3).fade(0.1).toString()})`,
            opacity: 0,
            transition: `opacity 0.5s ease 0s`,
        },
        "&:focus-within": {
            ".thumbnail": {
                transform: `scale(0.9)`,
            },
            ".thumbnail::after": {
                opacity: 1,
            }
        },


        header: {
            a: {
                display: "block",
                textDecoration: "none",
                marginBottom: `${gridSpacing / 4}`,

                "h1, h2, h3": {
                    margin: `0.5em 0 1em`,
                },

                ".date": {
                    color: Color(colours.brandPrimary).desaturate(1).toString(),
                },

                "&:hover": {
                    textDecoration: "underline",
                },
            }
        },

        footer: {
            marginTop: "1em",
            a: {
                color: Color(colours.brandPrimary).desaturate(1).toString(),
            }
        }
    }
);

export const BlogList: React.FC<BlogListProps> = ({ className, Blogs, frontPage }) => {
    return (
        <ul className={className} css={stylesList}>
            {
                Blogs.map((post, idx) =>
                    <li key={idx} css={stylesLi}>
                        <article>
                            {post.thumbnail && (
                                <Link to={post.slug} className="thumbnail">
                                    <GatsbyImage alt={post.title} image={post.thumbnail} />
                                </Link>
                            )}
                            <header>
                                <Link to={post.slug}>
                                    <div className={"date"}>{post.date}</div>
                                    {
                                        frontPage ? <H3 css={stylesH4} className={"title"}>{post.title}</H3> :
                                            <H2 css={stylesH4} className={"title"}>{post.title}</H2>
                                    }
                                </Link>
                            </header>
                            {post.description}
                            <footer>
                                <Link to={post.slug}>Read more&hellip;</Link>
                            </footer>
                        </article>
                    </li>
                )
            }
        </ul>
    )
}

interface BlogArchiveProps {
    className?: string,
    blogPosts: BlogSummary[],
    frontPage: boolean,
    heading: string,
    text: string,
}


export const BlogArchive: React.FC<BlogArchiveProps> =
    ({ className, heading, text, blogPosts, frontPage }) => {
        if (blogPosts.length == 0) {
            return <></>;
        }
        return (
            <section className={className}>
                <SectionHeader
                    heading={
                        frontPage ?
                            <h2 css={stylesBigH1}>{heading}</h2> :
                            <h1 css={stylesBigH1}>{heading}</h1>
                    }
                    bodyText={text}
                />
                <BlogList Blogs={blogPosts as [BlogSummary]} frontPage={frontPage} />
                {
                    frontPage &&
                    <Link to={"/blog/"} css={css(cols(12), { color: "inherit" })}>(View All)</Link>
                }
            </section>
        );
    }