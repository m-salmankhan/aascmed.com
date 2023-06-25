import React from "react";
import {graphql, PageProps} from "gatsby";
import {Hero} from "../components/header";
import {css} from "@emotion/react";
import {H2, stylesH1} from "../components/headings";
import {Container} from "../components/containers";

const IndexPage: React.FC = ({ data }: PageProps<Queries.IndexPageQuery>) => {
    const image = data.heroImage.edges[0].node.childImageSharp.gatsbyImageData;
    const siteTitle = data.siteTitle.siteMetadata.title;
    const heroTitle = data.heroText.edges[0].node.childMdx.frontmatter.hero.heading || siteTitle;
    const heroText = data.heroText.edges[0].node.childMdx.frontmatter.hero.text || "";
    return (
        <main>
            <Hero image={image} heading={heroTitle} siteTitle={siteTitle} text={heroText}/>
            <section>
                <Container>
                    <H2 css={stylesH1}>Learn more about the conditions we treat</H2>
                </Container>
            </section>
            <div css={css({height: "1000px"})}/>
        </main>
    );
}

export default IndexPage

export const query = graphql`
  query IndexPage {
    heroText: allFile(
      filter: {sourceInstanceName: {eq: "content"}, relativePath: {eq: "pages/home.mdx"}}
    ) {
      edges {
        node {
          childMdx {
            frontmatter {
              hero {
                heading
                text
              }
            }
          }
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