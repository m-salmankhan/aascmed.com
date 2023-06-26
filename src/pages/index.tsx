import React from "react";
import {graphql, PageProps} from "gatsby";
import {Hero} from "../components/header";
import {css} from "@emotion/react";
import {ConditionsIndex, ConditionSummary} from "../components/conditions/conditions-index";

const IndexPage: React.FC = ({ data }: PageProps<Queries.IndexPageQuery>) => {
    const heroImage = data.heroImage.edges[0].node.childImageSharp.gatsbyImageData;
    const siteTitle = data.siteTitle.siteMetadata.title;

    const hero = data.sectionCopy.childPagesYaml.hero;
    const conditions = data.sectionCopy.childPagesYaml.conditions;

    const heroTitle = hero.heading || siteTitle;
    const heroText = hero.text || "";

    const conditionsTitle = conditions.heading || "Learn more about the conditions we treat."
    const conditionsText = conditions.text || "";
    const conditionsList: ConditionSummary[] = data.conditions.edges.map(edge => ({
        slug: edge.node.fields.slug,
        title: edge.node.frontmatter.title,
        thumbnail: edge.node.frontmatter.thumbnail.childImageSharp.gatsbyImageData,
    }));

    return (
        <main>
            <Hero image={heroImage} heading={heroTitle} siteTitle={siteTitle} text={heroText}/>
            <ConditionsIndex heading={conditionsTitle} text={conditionsText} frontPage={true} conditionsList={[...conditionsList, ...conditionsList, ...conditionsList, ...conditionsList]} css={css({marginTop: "4em",})} />
            <div css={css({height: "1000px"})}/>
        </main>
    );
}

export default IndexPage

export const query = graphql`
  query IndexPage {
    sectionCopy: file(relativePath: {eq: "pages/home.yml"}) {
      childPagesYaml {
        conditions {
          heading
          text
        }
        hero {
          heading
          text
        }
      }
    }
    heroImage: allFile(filter: {relativePath: {eq: "hero-bg.png"}}) {
      edges {
        node {
          childImageSharp {
            gatsbyImageData(layout: FULL_WIDTH)
          }
        }
      }
    }
    siteTitle: site(siteMetadata: {}) {
      siteMetadata {
        title
      }
    }
    conditions: allMdx(filter: {fields: {post_type: {eq: "conditions"}}}) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            thumbnail {
              childImageSharp {
                gatsbyImageData(width: 600)
              }
            }
            title
          }
        }
      }
    }
  }
`
