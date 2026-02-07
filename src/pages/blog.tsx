import { graphql, HeadProps, PageProps } from "gatsby";
import React from "react";
import { Layout } from "../components/layouts/default";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Container } from "../components/containers";
import { gridSpacing } from "../styles/theme";
import { SEO, usePageTitle } from "../components/seo";
import { BlogArchive, BlogSummary } from "../components/blog-posts";
import { getImage } from "gatsby-plugin-image";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";

const BlogPage: React.FC<PageProps<Queries.BlogsQuery>> = ({ data }) => {
  const archiveCopy = data.strapiBlogArchive;
  const blogsTitle = archiveCopy?.heading || "Blog";
  const pageTitle = usePageTitle(blogsTitle);
  
  // Parse text blocks from internal.content
  const rawContent = archiveCopy?.internal?.content;
  const parsedData = rawContent ? JSON.parse(rawContent) : null;
  const textBlocks = parsedData?.text as any[] | null;

  const blogs: BlogSummary[] = data.blogs.nodes.map(node => ({
    slug: `/blog/${node.slug}/`,
    title: node.title || "Untitled",
    date: node.date || "",
    description: node.description || "",
    thumbnail: getImage(node.thumbnail?.localFile?.childImageSharp?.gatsbyImageData ?? null) ?? undefined,
  }));
  return (
    <Layout pageTitle={pageTitle}>
      <Container>
        <Breadcrumbs path={[
          ["/", "Home"],
          ["/blog/", "Blog"]
        ]} css={css({ marginTop: "3em" })} />
        <BlogArchive
          heading={blogsTitle}
          textContent={textBlocks ? <StrapiBlocksRenderer content={textBlocks} /> : undefined}
          blogPosts={blogs}
          frontPage={false}
          css={css({
            margin: `0 -${gridSpacing / 2}em`,
          })}
        />
      </Container>
    </Layout>
  )
}

export const Head = (props: HeadProps<Queries.BlogsQuery>) => {
  const description = props.data.strapiBlogArchive?.metaDescription || "";
  const heading = props.data.strapiBlogArchive?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export default BlogPage;

export const query = graphql`
  query Blogs {
    strapiBlogArchive {
      heading
      metaDescription
      internal {
        content
      }
    }
    blogs: allStrapiBlog(sort: {date: DESC}) {
      nodes {
        slug
        title
        description
        date(formatString: "Do MMMM YYYY")
        thumbnail {
          localFile {
            childImageSharp {
              gatsbyImageData(width: 400, height: 250, transformOptions: { cropFocus: CENTER })
            }
          }
        }
      }
    }
  }
`

