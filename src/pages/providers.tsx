import { graphql, HeadProps, PageProps } from "gatsby"
import { Layout } from "../components/layouts/default";
import { Container } from "../components/containers";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { SectionHeader, stylesBigH1 } from "../components/headings";
import { ProviderArchive, ProviderSummary } from "../components/providers";
import { gridSpacing } from "../styles/theme";
import { SEO } from "../components/seo";

const stylesExpandGridPadding = css`
    margin: 0 ${-gridSpacing / 2}em;
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
        ]} css={css({ marginTop: "3em" })} />

        <div css={stylesExpandGridPadding}>
          <SectionHeader heading={<h1 css={stylesBigH1}>{pageHeading}</h1>} bodyText={pageText} />
          <ProviderArchive providers={providers} />
        </div>
      </Container>
    </Layout>
  )
}

export const Head = (props: HeadProps<Queries.ProvidersPageQuery>) => {
  const description = props.data.copy?.childPagesYaml?.meta_description || "";
  const heading = props.data.copy?.childPagesYaml?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export const query = graphql`
  query ProvidersPage {
    copy: file(relativePath: {eq: "pages/providers.yml"}) {
      childPagesYaml {
        meta_description
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