import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyCondition, mapGatsbyText } from "../shared/content/gatsby-adapter";
import { conditionPath } from "../shared/content/urls";
import { ConditionsArchiveView } from "../views/fixed-archive";

const ConditionsPage = ({ data }: PageProps<Queries.ConditionsArchiveQuery>) => {
  const archive = data.strapiConditionsArchive;
  const conditions = data.conditions.nodes.map((node) => {
    const condition = mapGatsbyCondition({ ...node, id: node.id });
    return {
      slug: conditionPath(condition.slug) || "/conditions/",
      title: condition.heading || condition.title || "untitled",
      thumbnail: condition.thumbnail,
    };
  });
  return <ConditionsArchiveView heading={archive?.heading || "Conditions"} blocks={mapGatsbyText(archive || {})} conditions={conditions} />;
};

export const Head = (props: HeadProps<Queries.ConditionsArchiveQuery>) => {
  const description = props.data.strapiConditionsArchive?.metaDescription || "";
  const heading = props.data.strapiConditionsArchive?.heading || "";
  return <SEO description={description} slug={props.location.pathname} title={heading}>
    <meta name="og:type" content="website" />
  </SEO>;
};

export const query = graphql`
  query ConditionsArchive {
    strapiConditionsArchive { heading metaDescription internal { content } }
    conditions: allStrapiCondition(sort: {order: ASC}) {
      nodes {
        id
        slug
        title
        heading
        thumbnail { localFile { childImageSharp { gatsbyImageData(width: 800) } } }
      }
    }
  }
`;

export default ConditionsPage;
