import { graphql, HeadProps, PageProps } from "gatsby";
import React from "react";
import { Layout } from "../components/layouts/default";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Container } from "../components/containers";
import { gridSpacing } from "../styles/theme";
import { SEO } from "../components/seo";
import { BlogArchive, BlogSummary } from "../components/blog-posts";

const BlogPage: React.FC<PageProps<Queries.BlogsQuery>> = ({ data }) => {
  const pageCopy = data.sectionCopy?.childPagesYaml;
  const blogsTitle = pageCopy?.heading || "Blog"
  const blogsText = pageCopy?.text || "";

  const blogs: BlogSummary[] = data.blogs.edges.map(edge => ({
    slug: edge.node.fields?.slug || "",
    title: edge.node.frontmatter?.title || "Untitled",
    date: edge.node.frontmatter?.date || "",
    description: edge.node.excerpt || "",
  }));
  return (
    <Layout>
      <Container>
        <Breadcrumbs path={[
          ["/", "Home"],
          ["/blog/", "Blog"]
        ]} css={css({ marginTop: "3em" })} />
        <BlogArchive
          heading={blogsTitle}
          text={blogsText}
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
  const description = props.data.sectionCopy?.childPagesYaml?.meta_description || "";
  const heading = props.data.sectionCopy?.childPagesYaml?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export default BlogPage;

export const query = graphql`
  query Blogs {
    sectionCopy: file(relativePath: {eq: "pages/blog.yml"}) {
      childPagesYaml {
        meta_description
        heading
        text
      }
    }
    blogs: allMdx(
      filter: {fields: {post_type: {eq: "blog-post"}}}
      sort: {frontmatter: {date: DESC}}
    ) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            date(formatString: "Do MMMM YYYY")
            title
            description
          }
          excerpt(pruneLength: 300)
        }
      }
    }
  }
`

