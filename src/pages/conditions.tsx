import * as React from "react"
import {graphql, PageProps} from "gatsby"
import {Layout} from "../components/layouts/default";
import {ConditionsArchive} from "../components/conditions";
import {css} from "@emotion/react";
import {ConditionSummary} from "../components/conditions/conditions-archive";
import {Breadcrumbs} from "../components/breadcrumbs";
import {Container} from "../components/containers";
import {gridSpacing} from "../styles/theme";

const ConditionsPage = ({ data }: PageProps<Queries.ConditionsArchiveQuery>) => {
    const heading = data.copy?.childPagesYaml?.heading || "Conditions";
    const text = data.copy?.childPagesYaml?.text || "";

    const conditions: ConditionSummary[] = data.conditions.edges.map(edge => ({
        slug: edge.node.fields?.slug || "",
        title: edge.node.frontmatter?.title || "untitled",
        thumbnail: edge.node.frontmatter?.thumbnail?.childImageSharp?.gatsbyImageData,
    }));

    return (
        <Layout>
            <main>
                <Container>
                    <Breadcrumbs path={[
                        ["'", "Home"],
                        ["/conditions/", "Conditions"]
                    ]} css={css({marginTop: "3em"})} />
                    <ConditionsArchive
                        heading={heading}
                        text={text}
                        frontPage={false}
                        showViewAll={false}
                        conditionsList={conditions}
                        css={{margin: `2em -${gridSpacing/2}`}}
                    />
                </Container>

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

export default ConditionsPage