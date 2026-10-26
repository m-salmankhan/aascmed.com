import React from "react";
import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyCondition } from "../shared/content/gatsby-adapter";
import { ConditionView } from "../views/condition";

const Condition = ({ data, location }: PageProps<Queries.ConditionPageQuery>) => {
  const condition = data.strapiCondition;
  if (!condition) throw Error("Condition is undefined");
  return <ConditionView condition={mapGatsbyCondition(condition)} pathname={location.pathname} />;
};

export const Head = (props: HeadProps<Queries.ConditionPageQuery, { ogImagePath?: string }>) => {
  const title = props.data.strapiCondition?.title || props.data.strapiCondition?.heading || "Untitled";
  const description = props.data.strapiCondition?.description || "";
  const image = props.pageContext.ogImagePath || props.data.strapiCondition?.thumbnail?.localFile?.publicURL || undefined;
  return <SEO description={description} slug={props.location.pathname} title={title} image={image}>
    <meta name="og:type" content="article" />
    <meta name="article:section" content="conditions" />
  </SEO>;
};

export const query = graphql`
  query ConditionPage($id: String) {
    strapiCondition(id: {eq: $id}) {
      id
      slug
      title
      heading
      description
      internal { content }
      thumbnail {
        localFile {
          childImageSharp { gatsbyImageData(width: 800) }
          publicURL
        }
      }
    }
  }
`;

export default Condition;
