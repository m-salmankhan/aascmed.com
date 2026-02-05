import { graphql, HeadProps, PageProps } from "gatsby"
import { Layout } from "../components/layouts/default";
import { Container } from "../components/containers";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { SectionHeader, stylesBigH1 } from "../components/headings";
import { ProviderArchive, ProviderSummary } from "../components/providers";
import { gridSpacing } from "../styles/theme";
import { SEO } from "../components/seo";
import { createExcerpt } from "../utils/strapi-excerpt";

const stylesExpandGridPadding = css`
    margin: 0 ${-gridSpacing / 2}em;
`;

const ProvidersPage = ({ data }: PageProps<Queries.ProvidersPageQuery>) => {
  const pageHeading = data.copy?.childPagesYaml?.heading || "Meet the team";
  const pageText = data.copy?.childPagesYaml?.text || "";

  const providers: ProviderSummary[] = data.providers.nodes.map((node) => {
    // Parse body content from internal.content to create excerpt
    const rawContent = node.internal?.content;
    const parsedData = rawContent ? JSON.parse(rawContent) : null;
    const body = parsedData?.body as any[] | undefined;
    const excerpt = body ? createExcerpt(body, 600) : "";

    return {
      slug: `/providers/${node.slug}/`,
      name: {
        fullName: node.name?.fullName || "",
        title: node.name?.honorific && node.name.honorific !== "None" ? node.name.honorific : "",
        degreeAbbr: node.name?.qualificationAbbr || "",
      },
      image: node.image?.localFile?.childImageSharp?.gatsbyImageData,
      excerpt,
      retired: node.retirementNotice?.retired || false,
    };
  });

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
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
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
    providers: allStrapiProvider(sort: {order: ASC}) {
      nodes {
        id
        slug
        internal {
          content
        }
        name {
          fullName
          honorific
          qualificationAbbr
        }
        retirementNotice {
          retired
        }
        image {
          localFile {
            childImageSharp {
              gatsbyImageData(aspectRatio: 1, layout: FULL_WIDTH)
            }
          }
        }
      }
    }
  }
`

export default ProvidersPage;