import React from "react";
import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyServiceUpdate } from "../shared/content/gatsby-adapter";
import { ServiceUpdateView } from "../views/service-update";

const ServiceUpdate = ({ data, location }: PageProps<Queries.ServiceUpdatePageQuery>) => {
  const serviceUpdate = data.strapiServiceUpdate;
  if (!serviceUpdate) throw Error("Service update is undefined");
  return <ServiceUpdateView serviceUpdate={mapGatsbyServiceUpdate(serviceUpdate)} pathname={location.pathname} />;
};

export const Head = (props: HeadProps<Queries.ServiceUpdatePageQuery>) => {
  const title = props.data.strapiServiceUpdate?.title || "Untitled";
  const description = props.data.strapiServiceUpdate?.description || "";
  return <SEO description={description} slug={props.location.pathname} title={title} useTracking>
    <meta name="og:type" content="article" />
    <meta name="article:section" content="service-updates" />
  </SEO>;
};

export const query = graphql`
  query ServiceUpdatePage ($id: String) {
    strapiServiceUpdate(id: {eq: $id}) {
      id
      slug
      title
      description
      date
      internal { content }
    }
  }
`;

export default ServiceUpdate;
