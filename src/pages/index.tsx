import React from "react";
import {graphql, PageProps} from "gatsby";
import {Hero} from "../components/header";
import {css} from "@emotion/react";
import {ConditionsArchive} from "../components/conditions/";
import {ConditionSummary} from "../components/conditions/conditions-archive";
import {ServiceUpdateArchive} from "../components/service-updates";
import {ServiceUpdateSummary} from "../components/service-updates/service-update-archive";
import {App} from "../components/layouts/app";
import {ProviderSummary, ProvidersArchiveHomePageLayout} from "../components/providers";
import {PatientFeedback} from "../components/patient-feedback";

const IndexPage: React.FC = ({ data }: PageProps<Queries.IndexPageQuery>) => {
    const heroImage = data.heroImage.edges[0].node.childImageSharp.gatsbyImageData;
    const siteTitle = data.siteTitle.siteMetadata.title;

    const heroCopy = data.sectionCopy.childPagesYaml.hero;
    const heroTitle = heroCopy.heading || siteTitle;
    const heroText = heroCopy.text || "";

    const conditionsCopy = data.sectionCopy.childPagesYaml.conditions;
    const conditionsTitle = conditionsCopy.heading || "Learn more about the conditions we treat."
    const conditionsText = conditionsCopy.text || "";
    const conditions: ConditionSummary[] = data.conditions.edges.map(edge => ({
        slug: edge.node.fields.slug,
        title: edge.node.frontmatter.title,
        thumbnail: edge.node.frontmatter.thumbnail.childImageSharp.gatsbyImageData,
    }));

    const serviceUpdatesCopy = data.sectionCopy.childPagesYaml.service_updates;
    const serviceUpdatesTitle = serviceUpdatesCopy.heading || "Service Updates"
    const serviceUpdatesText = serviceUpdatesCopy.text || "";
    const serviceUpdates: ServiceUpdateSummary[] = data.serviceUpdates.edges.map(edge => ({
        slug: edge.node.fields.slug,
        title: edge.node.frontmatter.title,
        date: edge.node.frontmatter.date,
        description: edge.node.frontmatter.description,
    }));

    const providersCopy = data.sectionCopy.childPagesYaml.providers;
    const providersTitle = providersCopy.heading || "Meet the team"
    const providersText = providersCopy.text || "";
    const providers: ProviderSummary[] = data.providers.edges.map(edge => ({
        slug: edge.node.fields.slug,
        name: {
            fullName: edge.node.frontmatter.name.fullname,
            title: edge.node.frontmatter.name.title,
            degreeAbbr: edge.node.frontmatter.name.degree_abbr,
        },
        image: edge.node.frontmatter.image.childImageSharp.gatsbyImageData,
    }));

    return (
        <App>
            <main>
                <Hero image={heroImage} heading={heroTitle} siteTitle={siteTitle} text={heroText}/>
                <ConditionsArchive heading={conditionsTitle} text={conditionsText} frontPage={true} conditionsList={[...conditions, ...conditions, conditions[0]]} css={css({marginTop: "5em",})} />
                <ServiceUpdateArchive serviceUpdates={serviceUpdates} frontPage={true} heading={serviceUpdatesTitle} text={serviceUpdatesText} css={css({marginTop: "4em",})} />
                <ProvidersArchiveHomePageLayout providers={providers} heading={providersTitle} text={providersText} css={css({marginTop: "4em",})} />
                <PatientFeedback css={css({marginTop: "5em",})} />
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
        providers {
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
    providers: allMdx(
      filter: {fields: {post_type: {eq: "providers"}}}
      sort: {frontmatter: {order: ASC}}
    ) {
      edges {
        node {
          id
          frontmatter {
            image {
              childImageSharp {
                gatsbyImageData(width: 700)
              }
            }
            name {
              fullname
              degree_abbr
            }
          }
          fields {
            slug
          }
        }
      }
    }
    reviews: allMdx(filter: {fields: {post_type: {eq: "review"}}}) {
      edges {
        node {
          frontmatter {
            stars
            source {
              name
              url
            }
          }
          body
        }
      }
    }
  }
`

