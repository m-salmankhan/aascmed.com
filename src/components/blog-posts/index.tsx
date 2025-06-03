import { H2, H3, SectionHeader, stylesBigH1, stylesH4 } from "../headings";
import { css } from "@emotion/react";
import React from "react";
import { cols, gridContainer } from "../../styles/grid";
import { mediaBreakpoints } from "../../styles/breakpoints";
import { Link } from "gatsby";
import { colours, gridSpacing } from "../../styles/theme";
import Color from "color";

export interface BlogSummary {
    slug: string,
    date: string,
    title: string,
    description: string,
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