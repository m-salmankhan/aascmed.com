import React from "react";
import { graphql, HeadProps, PageProps } from "gatsby"
import { H1 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Article } from "../components/posts/article";
import { ShareButtons } from "../components/social-media/share";
import { ContactBanner } from "../components/posts/shortcode-components";
import { SEO } from "../components/seo";
import { GatsbyImage, IGatsbyImageData } from "gatsby-plugin-image";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";
import { Contents, ContentsPageItem } from "../components/posts/contents";

// Helper to convert text to URL-friendly slug
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

// Extract table of contents from Strapi blocks
function extractTableOfContents(content: any[]): ContentsPageItem[] {
    const tocItems: ContentsPageItem[] = [];
    
    if (!content || !Array.isArray(content)) return tocItems;
    
    // First pass: find the minimum heading level used
    let minLevel = 6;
    for (const component of content) {
        if (component.strapi_component === 'generic.rich-text' && component.text) {
            for (const block of component.text) {
                if (block.type === 'heading' && block.level) {
                    minLevel = Math.min(minLevel, block.level);
                }
            }
        }
    }
    
    // Second pass: extract headings, treating minLevel as "top level"
    for (const component of content) {
        if (component.strapi_component === 'generic.rich-text' && component.text) {
            for (const block of component.text) {
                if (block.type === 'heading' && block.level && block.level <= minLevel + 1) {
                    // Extract text from children
                    const headingText = block.children
                        ?.map((child: any) => child.text || '')
                        .join('') || '';
                    
                    if (!headingText.trim()) continue;
                    
                    const slug = slugify(headingText);
                    const item: ContentsPageItem = {
                        title: headingText,
                        url: `#${slug}`,
                    };
                    
                    // Top-level heading (e.g., h2 or h3 if no h2s exist)
                    if (block.level === minLevel) {
                        tocItems.push(item);
                    }
                    // Sub-heading (one level deeper), nest under the last top-level heading
                    else if (block.level === minLevel + 1 && tocItems.length > 0) {
                        const lastTopLevel = tocItems[tocItems.length - 1];
                        if (!lastTopLevel.items) lastTopLevel.items = [];
                        lastTopLevel.items.push(item);
                    }
                }
            }
        }
    }
    
    return tocItems;
}

// Component to render Strapi dynamic zone content
const StrapiContent = ({ content }: { content: any[] }) => {
    if (!content || !Array.isArray(content)) return null;

    return (
        <>
            {content.map((component, index) => {
                // Handle rich text component
                if (component.strapi_component === 'generic.rich-text' && component.text) {
                    return (
                        <StrapiBlocksRenderer key={index} content={component.text} />
                    );
                }
                
                // Handle contact booking CTA component
                if (component.strapi_component === 'generic.contact-booking-cta') {
                    return <ContactBanner key={index} />;
                }

                return null;
            })}
        </>
    );
}

const BlogPost = ({ data, location }: PageProps<Queries.BlogPostQuery>) => {
    const blog = data.strapiBlog;
    
    if (!blog) {
        throw Error("Blog post is undefined");
    }

    const title = blog.title || "Untitled"
    const heading = blog.heading || title
    const date = blog.date || ""
    const slug = `/blog/${blog.slug}/`
    const heroImage = blog.thumbnail?.localFile?.childImageSharp?.gatsbyImageData;
    
    // Parse raw JSON content to get full rich text data with all formatting
    const rawContent = blog.internal?.content;
    const parsedData = rawContent ? JSON.parse(rawContent) : null;
    console.log(parsedData)
    const content = parsedData?.content as any[] | undefined;
    
    // Extract table of contents from content
    const tocItems = content ? extractTableOfContents(content) : [];
    return (
        <PrimarySecondaryColumnsLayout>
            <main css={css`margin-bottom: 5rem;`}>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/blog/", "Blog"],
                    [slug, title]
                ]} css={css({ marginTop: "3em" })} />

                <Article css={css({ h3: { fontSize: "1rem" } })}>
                    <H1>{heading}</H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />
                    <p>Posted on {date}</p>
                    <Columns>
                        <MainCol>
                            <HeroImage img={heroImage} />
                            
                            {content && <StrapiContent content={content} />}
                            
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
    const title = props.data.strapiBlog?.title || props.data.strapiBlog?.heading || "Untitled";
    const description = props.data.strapiBlog?.description || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={title} useTracking={true}>
            <meta name={"og:type"} content={"article"} />
            <meta name={"article:section"} content={"blog"} />
        </SEO>
    )
}

export const query = graphql`
  query BlogPost ($id: String) {
    strapiBlog(id: {eq: $id}) {
      id
      slug
      title
      heading
      description
      date(formatString: "Do MMMM YYYY")
      internal {
        content
      }
      thumbnail {
        localFile {
          childImageSharp {
            gatsbyImageData(layout: FULL_WIDTH)
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
        margin: 1.5em auto;
        
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