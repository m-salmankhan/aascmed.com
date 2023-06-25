import React from "react";
import {graphql, PageProps} from "gatsby";
import {Hero} from "../components/header";
import {css} from "@emotion/react";
import {H2, stylesH1} from "../components/headings";
import {Container} from "../components/containers";
import {ConditionsIndex} from "../components/conditions/conditions-index";

const IndexPage: React.FC = ({ data }: PageProps<Queries.IndexPageQuery>) => {
    const image = data.heroImage.edges[0].node.childImageSharp.gatsbyImageData;
    const siteTitle = data.siteTitle.siteMetadata.title;

    const hero = data.sectionCopy.childPagesYaml.hero;
    const conditions = data.sectionCopy.childPagesYaml.conditions;

    const heroTitle = hero.heading || siteTitle;
    const heroText = hero.text || "";
    const conditionsTitle = conditions.heading || "Learn more about the conditions we treat."
    const conditionsText = conditions.text || "";
    return (
        <main>
            <Hero image={image} heading={heroTitle} siteTitle={siteTitle} text={heroText}/>
            <ConditionsIndex heading={conditionsTitle} text={conditionsText} frontPage={true} css={css({marginTop: "4em",})} />
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
      }
`