import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyProvider, mapGatsbyText } from "../shared/content/gatsby-adapter";
import { providerPath } from "../shared/content/urls";
import { createExcerpt } from "../utils/strapi-excerpt";
import { ProvidersArchiveView } from "../views/fixed-archive";

const ProvidersPage = ({ data }: PageProps<Queries.ProvidersPageQuery>) => {
  const archive = data.strapiProvidersPage;
  const providers = data.providers.nodes.map((node) => {
    const provider = mapGatsbyProvider(node);
    return {
      slug: providerPath(provider.slug) || "/providers/",
      excerpt: provider.body ? createExcerpt(provider.body, 600) : "",
      name: provider.name,
      retired: provider.retirementNotice?.retired || false,
      image: provider.image,
    };
  });
  return <ProvidersArchiveView heading={archive?.heading || "Meet the team"} blocks={mapGatsbyText(archive || {})} providers={providers} />;
};

export const Head = (props: HeadProps<Queries.ProvidersPageQuery>) => {
  const description = props.data.strapiProvidersPage?.metaDescription || "";
  const heading = props.data.strapiProvidersPage?.heading || "";
  return <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
    <meta name="og:type" content="website" />
  </SEO>;
};

export const query = graphql`
  query ProvidersPage {
    strapiProvidersPage { heading metaDescription internal { content } }
    providers: allStrapiProvider(sort: {order: ASC}) {
      nodes {
        id
        slug
        internal { content }
        name { fullName honorific qualificationAbbr }
        retirementNotice { retired }
        image { localFile { childImageSharp { gatsbyImageData(aspectRatio: 1, layout: FULL_WIDTH) } } }
      }
    }
  }
`;

export default ProvidersPage;
