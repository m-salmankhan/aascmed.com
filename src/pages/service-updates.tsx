import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyServiceUpdate, mapGatsbyText } from "../shared/content/gatsby-adapter";
import { serviceUpdatePath } from "../shared/content/urls";
import { ServiceUpdatesArchiveView } from "../views/fixed-archive";

const ServiceUpdatePage = ({ data }: PageProps<Queries.ServiceUpdatesQuery>) => {
  const archive = data.strapiServiceUpdatePage;
  const serviceUpdates = data.serviceUpdates.nodes.map((node) => {
    const update = mapGatsbyServiceUpdate({ ...node, id: node.id });
    const slug = serviceUpdatePath(update) || (update.slug ? `/service-updates/${update.slug}/` : "/service-updates/");
    return { slug, title: update.title || "Untitled", date: node.formattedDate || "", description: update.description || "" };
  });
  return <ServiceUpdatesArchiveView heading={archive?.heading || "Service Updates"}
    blocks={mapGatsbyText(archive || {})} serviceUpdates={serviceUpdates} />;
};

export const Head = (props: HeadProps<Queries.ServiceUpdatesQuery>) => {
  const description = props.data.strapiServiceUpdatePage?.metaDescription || "";
  const heading = props.data.strapiServiceUpdatePage?.heading || "";
  return <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
    <meta name="og:type" content="website" />
  </SEO>;
};

export default ServiceUpdatePage;

export const query = graphql`
  query ServiceUpdates {
    strapiServiceUpdatePage { heading metaDescription internal { content } }
    serviceUpdates: allStrapiServiceUpdate(sort: {date: DESC}) {
      nodes { id slug title description date formattedDate: date(formatString: "Do MMMM YYYY") }
    }
  }
`;
