import * as React from "react"
import {graphql, Link, PageProps} from "gatsby"
import {Columns, MainCol, SideCol, TwoColLayout} from "../components/layouts/two-col";
import {Breadcrumbs} from "../components/breadcrumbs";
import {css} from "@emotion/react";
import {Article} from "../components/posts/article";
import {H1, H4} from "../components/headings";
import {ShareButtons} from "../components/social-media/share";
import {MDXProvider} from "@mdx-js/react";
import {ButtonList, ContactBanner} from "../components/posts/shortcode-components";
import {GatsbyImage, getImage} from "gatsby-plugin-image";
import ReactMarkdown from "react-markdown";

const shortcodes = { Link, ButtonList, ContactBanner};

const stylesImage = css({
    width: "70%",
    height: "auto",
    borderRadius: "50%",
    overflow: "hidden",
});

const Provider = ({ data, location, children }: PageProps<Queries.ProviderQuery>) => {
    if((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");

    const name = data.mdx.frontmatter.name?.fullname || "Untitled";
    const honorific = data.mdx.frontmatter.name?.title + "." || "";
    const degreeAbbr = data.mdx.frontmatter.name?.degree_abbr || "";

    const image = getImage(data.mdx.frontmatter.image);
    const review = data.mdx.frontmatter.review || "";

    const pageTitle = `${honorific} ${name}`.trim();
    const pageHeading = `${name}, ${degreeAbbr}`.trim();

    return (
        <TwoColLayout>
            <main>
                <Breadcrumbs path={[
                    ["'", "Home"],
                    ["/providers/", "Providers"],
                    [data.mdx.fields.slug, data.mdx.frontmatter.name?.fullname]
                ]} css={css({marginTop: "3em"})} />
                <Article css={css({h3: {fontSize: "1rem"}})}>
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
                                <GatsbyImage css={stylesImage} alt={`A photo of ${honorific} ${name}`} image={image} />
                                <H4>Featured Review</H4>
                                <ReactMarkdown>
                                    {review}
                                </ReactMarkdown>
                            </aside>
                        </SideCol>
                    </Columns>
                </Article>
            </main>
        </TwoColLayout>
    );
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