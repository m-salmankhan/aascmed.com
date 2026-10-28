import React from "react";
import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyProvider } from "../shared/content/gatsby-adapter";
import { ProviderView } from "../views/provider";

const Provider = ({ data, location }: PageProps<Queries.ProviderPageQuery>) => {
  const provider = data.strapiProvider;
  if (!provider) throw Error("Provider is undefined");
  return <ProviderView provider={mapGatsbyProvider(provider)} pathname={location.pathname} />;
};

export const Head = (props: HeadProps<Queries.ProviderPageQuery>) => {
  const provider = props.data.strapiProvider;
  const name = provider?.name?.fullName || "Untitled";
  const honorific = provider?.name?.honorific && provider.name.honorific !== "None" ? provider.name.honorific : "";
  const pageTitle = `${honorific} ${name}`.trim();
  const description = provider?.description || "";
  const image = provider?.image?.localFile?.publicURL || undefined;
  return <SEO description={description} slug={props.location.pathname} title={pageTitle} image={image} useTracking>
    <meta name="og:type" content="profile" />
  </SEO>;
};

export const query = graphql`
  query ProviderPage($id: String) {
    strapiProvider(id: {eq: $id}) {
      id
      slug
      description
      internal { content }
      name { fullName honorific qualificationLong qualificationAbbr }
      retirementNotice { retired }
      review { text reviewer date(formatString: "MMMM D, YYYY") link }
      image {
        localFile {
          childImageSharp { gatsbyImageData(layout: FULL_WIDTH, aspectRatio: 1) }
          publicURL
        }
      }
    }
  }
`;

export default Provider;
