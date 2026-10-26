import React from "react";
import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyBlog } from "../shared/content/gatsby-adapter";
import { BlogPostView } from "../views/blog-post";

const BlogPost = ({ data, location }: PageProps<Queries.BlogPostQuery>) => {
  const blog = data.strapiBlog;
  if (!blog) throw Error("Blog post is undefined");
  return <BlogPostView blog={mapGatsbyBlog(blog)} pathname={location.pathname} />;
};

export const Head = (props: HeadProps<Queries.BlogPostQuery, { ogImagePath?: string }>) => {
  const title = props.data.strapiBlog?.title || props.data.strapiBlog?.heading || "Untitled";
  const description = props.data.strapiBlog?.description || "";
  return <SEO description={description} slug={props.location.pathname} title={title} useTracking image={props.pageContext.ogImagePath}>
    <meta name="og:type" content="article" />
    <meta name="article:section" content="blog" />
  </SEO>;
};

export const query = graphql`
  query BlogPost ($id: String) {
    strapiBlog(id: {eq: $id}) {
      id
      slug
      title
      heading
      description
      date(formatString: "Do MMMM YYYY")
      internal { content }
      thumbnail { localFile { childImageSharp { gatsbyImageData(layout: FULL_WIDTH) } } }
    }
  }
`;

export default BlogPost;
