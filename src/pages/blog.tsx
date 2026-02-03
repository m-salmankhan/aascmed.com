import { graphql, HeadProps, PageProps } from "gatsby";
import React from "react";
import { Layout } from "../components/layouts/default";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Container } from "../components/containers";
import { gridSpacing } from "../styles/theme";
import { SEO } from "../components/seo";
import { BlogArchive, BlogSummary } from "../components/blog-posts";
import { getImage } from "gatsby-plugin-image";

const BlogPage: React.FC<PageProps<Queries.BlogsQuery>> = ({ data }) => {
  const pageCopy = data.sectionCopy?.childPagesYaml;
  const blogsTitle = pageCopy?.heading || "Blog"
  const blogsText = pageCopy?.text || "";

  const blogs: BlogSummary[] = data.blogs.nodes.map(node => ({
    slug: `/blog/${node.slug}/`,
    title: node.title || "Untitled",
    date: node.date || "",
    description: node.description || "",
    thumbnail: getImage(node.thumbnail?.localFile?.childImageSharp?.gatsbyImageData ?? null) ?? undefined,
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

