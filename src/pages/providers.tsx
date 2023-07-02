import * as React from "react"
import {graphql, PageProps} from "gatsby"
import {Layout} from "../components/layouts/default";
import {Container} from "../components/containers";
import {Breadcrumbs} from "../components/breadcrumbs";
import {css} from "@emotion/react";
import {H2, stylesH1} from "../components/headings";
import ReactMarkdown from "react-markdown";
import {cols} from "../styles/grid";
import {mediaBreakpoints} from "../styles/breakpoints";
import {ProviderArchive, ProviderSummary} from "../components/providers";
import {gridSpacing} from "../styles/theme";

const stylesTextWrapper = css(
    cols(12),
    cols(8, mediaBreakpoints.md),
);

const stylesHeading = css(
    cols(12),
    cols(9, mediaBreakpoints.lg),
    {
        fontSize: "2.5em",
        padding: 0,
        "@media screen": {
            padding: 0,
        }
    }
);

const stylesExpandGridPadding = css`
    margin: 0 ${-gridSpacing/2}em;
`;

const ProvidersPage = ({ data }: PageProps<Queries.ProvidersPageQuery>) => {
    const pageHeading = data.copy?.childPagesYaml?.heading || "Meet the team";
    const pageText = data.copy?.childPagesYaml?.text || "";

    const providers: ProviderSummary[] = data.providers.edges.map((edge) => ({
        slug: edge.node.fields?.slug || "",
        name: {
            fullName: edge.node.frontmatter?.name?.fullname || "",
            title: edge.node.frontmatter?.name?.title || "",
            degree: edge.node.frontmatter?.name?.degree || "",
            degreeAbbr: edge.node.frontmatter?.name?.degree_abbr || "",
        },
        image: edge.node.frontmatter?.image?.childImageSharp?.gatsbyImageData,
        excerpt: edge.node.excerpt || "",
    }));

    return (
        <Layout>
            <Container>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/providers/", "Providers"]
                ]} css={css({marginTop: "3em"})} />

                <div css={stylesExpandGridPadding}>
                    <div css={stylesTextWrapper}>
                        <H2 css={css(stylesH1, stylesHeading)}>{pageHeading}</H2>
                        <ReactMarkdown>
                            {pageText}
                        </ReactMarkdown>
                    </div>
                    <ProviderArchive providers={providers} />
                </div>
            </Container>
            {/*<pre>{JSON.stringify(data, null, 2)}</pre>*/}
        </Layout>
    )
}

export const query = graphql`
  query ProvidersPage {
    copy: file(relativePath: {eq: "pages/providers.yml"}) {
      childPagesYaml {
        heading
        text
      }
    }
    providers: allMdx(
      filter: {fields: {post_type: {eq: "providers"}}}
      sort: {frontmatter: {order: ASC}}
    ) {
      edges {
        node {
          id
          frontmatter {
            image {
              childImageSharp {
                gatsbyImageData(aspectRatio: 1, layout: FULL_WIDTH)
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
          excerpt(pruneLength: 500)
        }
      }
    }
  }
`

export default ProvidersPage;