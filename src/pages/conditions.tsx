import * as React from "react"
import {graphql, PageProps} from "gatsby"
import {Layout} from "../components/layouts/default";
import {ConditionsArchive} from "../components/conditions";
import {css} from "@emotion/react";
import {ConditionSummary} from "../components/conditions/conditions-archive";

const Page = ({ data }: PageProps<Queries.ConditionsArchiveQuery>) => {
    const heading = data.copy.childPagesYaml.heading;
    const text = data.copy.childPagesYaml.text;

    const conditions: ConditionSummary[] = data.conditions.edges.map(edge => ({
        slug: edge.node.fields.slug,
        title: edge.node.frontmatter.title,
        thumbnail: edge.node.frontmatter.thumbnail.childImageSharp.gatsbyImageData,
    }));

    return (
        <Layout>
            <main>
                <ConditionsArchive
                    heading={heading}
                    text={text}
                    frontPage={false}
                    showViewAll={false}
                    conditionsList={conditions}
                    css={css({marginTop: "5em",})}
                />

            </main>
        </Layout>
    )
}

export const query = graphql`
  query ConditionsArchive {
    copy: file(relativePath: {eq: "pages/conditions.yml"}) {
      childPagesYaml {
        heading
        text
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
  }
`

export default Page