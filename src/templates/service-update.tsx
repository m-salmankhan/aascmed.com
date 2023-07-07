import * as React from "react"
import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { MDXProvider } from "@mdx-js/react";
import { H1 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Article } from "../components/posts/article";
import { ShareButtons } from "../components/social-media/share";
import { PrimaryAnchor, PrimaryButton, stylesBtnSecondary, stylesButton } from "../components/buttons";
import { gridSpacing } from "../styles/theme";
import { useEffect, useState } from "react";
import { ButtonList, ContactBanner } from "../components/posts/shortcode-components";
import { SEO } from "../components/seo";

const shortcodes = { Link, ButtonList, ContactBanner };
const ServiceUpdate = ({ data, children, location }: PageProps<Queries.ServiceUpdatePageQuery>) => {
    const [jsEnabled, setJsEnabled] = useState(false);
    useEffect(() => setJsEnabled(true), [setJsEnabled]);

    if ((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if ((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");

    const title = data.mdx.frontmatter.title || "Untitled"
    const date = data.mdx.frontmatter.date || ""

    return (
        <PrimarySecondaryColumnsLayout>
            <main>
                <Breadcrumbs path={[
                    ["'", "Home"],
                    ["/service-updates/", "Service Updates"],
                    [data.mdx.fields?.slug, title]
                ]} css={css({ marginTop: "3em" })} />

                <Article css={css({ h3: { fontSize: "1rem" } })}>
                    <H1>{title}</H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />
                    <p>{date}</p>
                    <Columns>
                        <MainCol>
                            <MDXProvider components={shortcodes as any}>
                                {children}
                            </MDXProvider>
                            <footer>
                                {jsEnabled ?
                                    <PrimaryButton
                                        onClick={() => {
                                            history.back();
                                            return false;
                                        }}
                                        css={{ marginRight: gridSpacing / 2 + `em` }}>Go back</PrimaryButton> :
                                    <PrimaryAnchor css={{ marginRight: gridSpacing / 2 + `em` }} href={"/"}>Return to home</PrimaryAnchor>
                                }
                                <Link to={"/contact"} css={[stylesButton, stylesBtnSecondary]}>Get in touch</Link>
                            </footer>
                        </MainCol>
                    </Columns>
                </Article>
            </main>
        </PrimarySecondaryColumnsLayout>
    );
}


export const Head = (props: HeadProps<Queries.ServiceUpdatePageQuery>) => {
    const title = props.data.mdx?.frontmatter?.title || "Untitled";
    const description = props.data.mdx?.frontmatter?.description || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={title}>
            <meta name={"og:type"} content={"article"} />
            <meta name={"article:section"} content={"service-updates"} />
        </SEO>
    )
}

export const query = graphql`
  query ServiceUpdatePage ($id: String) {
    mdx(id: {eq: $id}) {
      fields {
        slug
      }
      frontmatter {
        date(formatString: "Do MMMM YYYY")
        title
        description
      }
    }
  }
`


export default ServiceUpdate