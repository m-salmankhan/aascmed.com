import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { MDXProvider } from "@mdx-js/react";
import { H1 } from "../components/headings";
import { Columns, MainCol, SideCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { ShareButtons } from "../components/social-media/share";
import { Contents, ContentsPageItem } from "../components/posts/contents";
import { Article } from "../components/posts/article";
import { ButtonList, ContactBanner, FAQ } from "../components/posts/shortcode-components";
import { SEO } from "../components/seo";

const shortcodes = { Link, ButtonList, ContactBanner, FAQ };
const Condition = ({ data, children, location }: PageProps<Queries.ConditionPageQuery>) => {
    if ((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if ((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");

    const title = data.mdx.frontmatter.title || "Untitled"
    const heading = data.mdx.frontmatter.heading || "Untitled"
    const tocItems = data.mdx.tableOfContents?.items as ContentsPageItem[];

    return (
        <PrimarySecondaryColumnsLayout>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/conditions/", "Conditions"],
                    [data.mdx?.fields?.slug, heading]
                ]} css={css({ marginTop: "3em" })} />
                <Article>
                    <H1><>{heading}</></H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />

                    <Columns>
                        <MainCol>
                            <MDXProvider components={shortcodes as any}>
                                {children}
                            </MDXProvider>
                            <footer>
                                <ShareButtons pageTitle={title} path={location.pathname} />
                            </footer>
                        </MainCol>
                        <SideCol>
                            <Contents items={tocItems} />
                        </SideCol>
                    </Columns>
                </Article>
            </main>
        </PrimarySecondaryColumnsLayout>
    );
}

export const Head = (props: HeadProps<Queries.ConditionPageQuery>) => {
    const title = props.data.mdx?.frontmatter?.title || "Untitled";
    const description = props.data.mdx?.frontmatter?.description || "";
    const image = props.data.mdx?.frontmatter?.thumbnail?.publicURL || undefined;

    return (
        <SEO description={description} slug={props.location.pathname} title={title} image={image}>
            <meta name={"og:type"} content={"article"} />
            <meta name={"article:section"} content={"conditions"} />
        </SEO>
    )
}



export const query = graphql`
  query ConditionPage($id: String) {
    mdx(id: {eq: $id}) {
      id
      tableOfContents(maxDepth: 3)
      body
      fields {
        slug
      }
      frontmatter {
        description
        title
        heading
        thumbnail {
            childImageSharp {
                gatsbyImageData(width: 800)
            }
            publicURL
          }
      }
    }
  }
`

export default Condition