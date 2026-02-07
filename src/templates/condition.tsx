import React from "react";
import { graphql, HeadProps, PageProps } from "gatsby"
import { H1 } from "../components/headings";
import { Columns, MainCol, SideCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { ShareButtons } from "../components/social-media/share";
import { Article } from "../components/posts/article";
import { SEO, usePageTitle } from "../components/seo";
import { StrapiDynamicZoneRenderer } from "../components/strapi/blocks-renderer";
import { Contents } from "../components/posts/contents";
import { extractTableOfContents } from "../utils/strapi-toc";

const Condition = ({ data, location }: PageProps<Queries.ConditionPageQuery>) => {
    const condition = data.strapiCondition;
    
    if (!condition) {
        throw Error("Condition is undefined");
    }

    const title = condition.title || "Untitled"
    const heading = condition.heading || title
    const slug = `/conditions/${condition.slug}/`
    const pageTitle = usePageTitle(title);
    
    // Parse raw JSON content to get full rich text data with all formatting
    const rawContent = condition.internal?.content;
    const parsedData = rawContent ? JSON.parse(rawContent) : null;
    const content = parsedData?.content as any[] | undefined;
    
    // Extract table of contents from content
    const tocItems = content ? extractTableOfContents(content) : [];

    return (
        <PrimarySecondaryColumnsLayout pageTitle={pageTitle}>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/conditions/", "Conditions"],
                    [slug, heading]
                ]} css={css({ marginTop: "3em" })} />
                <Article>
                    <H1>{heading}</H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />

                    <Columns>
                        <MainCol>
                            {content && <StrapiDynamicZoneRenderer content={content} />}

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
    const title = props.data.strapiCondition?.title || props.data.strapiCondition?.heading || "Untitled";
    const description = props.data.strapiCondition?.description || "";
    const image = props.data.strapiCondition?.thumbnail?.localFile?.publicURL || undefined;

    return (
        <SEO description={description} slug={props.location.pathname} title={title} image={image}>
            <meta name={"og:type"} content={"article"} />
            <meta name={"article:section"} content={"conditions"} />
        </SEO>
    )
}



export const query = graphql`
  query ConditionPage($id: String) {
    strapiCondition(id: {eq: $id}) {
      id
      slug
      title
      heading
      description
      internal {
        content
      }
      thumbnail {
        localFile {
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