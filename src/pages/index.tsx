import React from "react";
import {graphql, PageProps} from "gatsby";
import {Hero} from "../components/header";
import {css} from "@emotion/react";
import {ConditionsArchive} from "../components/conditions/";
import {ConditionSummary} from "../components/conditions/conditions-archive";
import {ServiceUpdateArchive} from "../components/service-updates";
import {ServiceUpdateSummary} from "../components/service-updates/service-update-archive";
import {App} from "../components/layouts/app";

const IndexPage: React.FC = ({ data }: PageProps<Queries.IndexPageQuery>) => {
    const heroImage = data.heroImage.edges[0].node.childImageSharp.gatsbyImageData;
    const siteTitle = data.siteTitle.siteMetadata.title;

    const hero = data.sectionCopy.childPagesYaml.hero;
    const conditions = data.sectionCopy.childPagesYaml.conditions;
    const serviceUpdates = data.sectionCopy.childPagesYaml.service_updates;

    const heroTitle = hero.heading || siteTitle;
    const heroText = hero.text || "";

    const conditionsTitle = conditions.heading || "Learn more about the conditions we treat."
    const conditionsText = conditions.text || "";
    const conditionsList: ConditionSummary[] = data.conditions.edges.map(edge => ({
        slug: edge.node.fields.slug,
        title: edge.node.frontmatter.title,
        thumbnail: edge.node.frontmatter.thumbnail.childImageSharp.gatsbyImageData,
    }));

    const serviceUpdatesTitle = serviceUpdates.heading || "Service Updates"
    const serviceUpdatesText = serviceUpdates.text || "";
    const serviceUpdatesList: ServiceUpdateSummary[] = data.serviceUpdates.edges.map(edge => ({
        slug: edge.node.fields.slug,
        title: edge.node.frontmatter.title,
        date: edge.node.frontmatter.date,
        description: edge.node.frontmatter.description,
    }));

    return (
        <App>
            <main>
                <Hero image={heroImage} heading={heroTitle} siteTitle={siteTitle} text={heroText}/>
                <ConditionsArchive heading={conditionsTitle} text={conditionsText} frontPage={true} conditionsList={[...conditionsList, ...conditionsList, conditionsList[0]]} css={css({marginTop: "5em",})} />
                <ServiceUpdateArchive serviceUpdates={serviceUpdatesList} frontPage={true} heading={serviceUpdatesTitle} text={serviceUpdatesText} css={css({marginTop: "5em",})} />
                <div css={css({height: "1000px"})}/>
            </main>
        </App>
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
        service_updates {
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
                gatsbyImageData(width: 800)
              }
            }
            title
          }
        }
      }
    }
    serviceUpdates: allMdx(filter: {fields: {post_type: {eq: "service-update"}}}) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            date(formatString: "Do MMMM YYYY")
            title
            description
          }
        }
      }
    }
  }
`
