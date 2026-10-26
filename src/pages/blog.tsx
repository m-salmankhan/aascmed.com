import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyBlog, mapGatsbyText } from "../shared/content/gatsby-adapter";
import { blogPath } from "../shared/content/urls";
import { BlogArchiveView } from "../views/fixed-archive";

const BlogPage = ({ data }: PageProps<Queries.BlogsQuery>) => {
  const archive = data.strapiBlogArchive;
  const blogs = data.blogs.nodes.map((node) => {
    const blog = mapGatsbyBlog({ ...node, id: node.id });
    return {
      slug: blogPath(blog.slug) || "/blog/",
      title: blog.title || "Untitled",
      date: node.date || "",
      description: blog.description || "",
      thumbnail: blog.thumbnail ? { ...blog.thumbnail, alt: blog.title || "Untitled" } : undefined,
    };
  });
  return <BlogArchiveView heading={archive?.heading || "Blog"} blocks={mapGatsbyText(archive || {})} blogs={blogs} />;
};

export const Head = (props: HeadProps<Queries.BlogsQuery>) => {
  const description = props.data.strapiBlogArchive?.metaDescription || "";
  const heading = props.data.strapiBlogArchive?.heading || "";
  return <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
    <meta name="og:type" content="website" />
  </SEO>;
};

export const query = graphql`
  query Blogs {
    strapiBlogArchive { heading metaDescription internal { content } }
    blogs: allStrapiBlog(sort: {date: DESC}) {
      nodes {
        id
        slug
        title
        description
        date(formatString: "Do MMMM YYYY")
        thumbnail { localFile { childImageSharp { gatsbyImageData(width: 400, height: 250, transformOptions: { cropFocus: CENTER }) } } }
      }
    }
  }
`;

export default BlogPage;
