import * as React from "react"
import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { Columns, MainCol, SideCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Article } from "../components/posts/article";
import { H1, H4 } from "../components/headings";
import { ShareButtons } from "../components/social-media/share";
import { MDXProvider } from "@mdx-js/react";
import { ButtonList, ContactBanner } from "../components/posts/shortcode-components";
import { GatsbyImage } from "gatsby-plugin-image";
import ReactMarkdown from "react-markdown";
import { SEO } from "../components/seo";
import { useSiteMetadata } from "../hooks/useSiteMetadata";

const shortcodes = { Link, ButtonList, ContactBanner };

const stylesImage = css({
  width: "70%",
  height: "auto",
  borderRadius: "50%",
  overflow: "hidden",
});

const Provider = ({ data, location, children }: PageProps<Queries.ProviderQuery>) => {
  if ((data.mdx === null) || (data.mdx === undefined))
    throw Error("mdx is undefined");

  if ((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
    throw Error("Frontmatter is undefined");

  const name = data.mdx.frontmatter.name?.fullname || "Untitled";
  const honorific = data.mdx.frontmatter.name?.title + "." || "";
  const degreeAbbr = data.mdx.frontmatter.name?.degree_abbr || "";

  const image = data.mdx.frontmatter.image?.childImageSharp?.gatsbyImageData;
  const review = data.mdx.frontmatter.review?.trim() || "";

  const pageTitle = `${honorific} ${name}`.trim();
  const pageHeading = `${name}, ${degreeAbbr}`.trim();

  return (
    <PrimarySecondaryColumnsLayout>
      <main>
        <Breadcrumbs path={[
          ["/", "Home"],
          ["/providers/", "Providers"],
          [data.mdx.fields?.slug, data.mdx.frontmatter.name?.fullname]
        ]} css={css({ marginTop: "3em" })} />
        <Article css={css({ h3: { fontSize: "1rem" } })}>
          <Columns>
            <MainCol>
              <H1><>{pageHeading}</></H1>
              <ShareButtons pageTitle={pageTitle} path={location.pathname} />

              <MDXProvider components={shortcodes as any}>
                {children}
              </MDXProvider>
              <footer>
                <ShareButtons pageTitle={pageTitle} path={location.pathname} />
              </footer>
            </MainCol>
            <SideCol>
              <aside>
                {
                  image &&
                  <GatsbyImage css={stylesImage} alt={`A photo of ${honorific} ${name}`} image={image} />
                }
                {
                  !!review &&
                  <>
                    <H4>Featured Review</H4>
                    <ReactMarkdown>
                      {review}
                    </ReactMarkdown>
                  </>
                }
              </aside>
            </SideCol>
          </Columns>
        </Article>
      </main>
    </PrimarySecondaryColumnsLayout>
  );
}


export const Head = (props: HeadProps<Queries.ProviderQuery>) => {
  const { url } = useSiteMetadata();

  const name = props.data.mdx?.frontmatter?.name?.fullname || "Untitled";
  const honorific = props.data.mdx?.frontmatter?.name?.title + "." || "";

  const pageTitle = `${honorific} ${name}`.trim();
  const description = props.data.mdx?.frontmatter?.description || "";

  const image = props.data.mdx?.frontmatter?.image?.publicURL || undefined;

  return (
    <SEO description={description} slug={props.location.pathname} title={pageTitle} image={image}>
      <meta name={"og:type"} content={"profile"} />
    </SEO>
  )
}

export const query = graphql`
  query Provider ($id: String) {
    mdx(id: {eq: $id}) {
      id
      fields {
        slug
      }
      frontmatter {
        description
        review
        image {
          childImageSharp {
            gatsbyImageData(
              layout: FULL_WIDTH
              aspectRatio: 1
            )
          }
          publicURL
        }
        name {
          fullname
          title
          degree
          degree_abbr
        }
      }
      fields {
        slug
      }
      body
    }
  }
`

export default Provider