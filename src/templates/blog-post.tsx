import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { MDXProvider } from "@mdx-js/react";
import { H1 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Article } from "../components/posts/article";
import { ShareButtons } from "../components/social-media/share";
import { ButtonList, ContactBanner } from "../components/posts/shortcode-components";
import { SEO } from "../components/seo";
import { Contents, ContentsPageItem } from "../components/posts/contents";
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image";

const shortcodes = { Link, ButtonList, ContactBanner };
const BlogPost = ({ data, children, location }: PageProps<Queries.BlogPostQuery>) => {
    if ((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if ((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");


    const title = data.mdx.frontmatter.title || "Untitled"
    const heading = data.mdx.frontmatter.heading || "Untitled"
    const tocItems = data.mdx.tableOfContents?.items as ContentsPageItem[];
    const date = data.mdx.frontmatter.date || ""
    const heroImage = data.mdx.frontmatter.thumbnail?.childImageSharp?.gatsbyImageData

    return (
        <PrimarySecondaryColumnsLayout>
            <main css={css`margin-bottom: 5rem;`}>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/blog/", "Blog"],
                    [data.mdx.fields?.slug, title]
                ]} css={css({ marginTop: "3em" })} />

                <Article css={css({ h3: { fontSize: "1rem" } })}>
                    <H1>{heading}</H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />
                    <p>Posted on {date}</p>
                    <Columns>
                        <MainCol>
                            <HeroImage img={heroImage} />
                            <MDXProvider components={shortcodes as any}>
                                {children}
                            </MDXProvider>

                            <ContactBanner />
                            
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


export const Head = (props: HeadProps<Queries.BlogPostQuery>) => {
    const title = props.data.mdx?.frontmatter?.title || props.data.mdx?.frontmatter?.heading || "Untitled";
    const description = props.data.mdx?.frontmatter?.description || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={title} useTracking={true}>
            <meta name={"og:type"} content={"article"} />
            <meta name={"article:section"} content={"blog"} />
        </SEO>
    )
}

export const query = graphql`
  query BlogPost ($id: String) {
    mdx(id: {eq: $id}) {
      id
      tableOfContents(maxDepth: 3)
      fields {
        slug
      }
      frontmatter {
        date(formatString: "Do MMMM YYYY")
          title
          heading
          description
          thumbnail {
            childImageSharp {
              gatsbyImageData(width: 900)
            }
        }
      }
    }
  }
`

const HeroImage = ({ img, className }: {img: IGatsbyImageData | undefined, className?: string}) => {
    if(!img) return <></>

    const styles = css`
        width: 100%;
        margin-bottom: 1.5em auto;
        
        .gatsby-image-wrapper {
            height: 20em;
        }
    `;

    return(
        <div className={className} css={css(styles)}>
        <GatsbyImage alt={""} image={img} />
        </div>
    );
}

export default BlogPost