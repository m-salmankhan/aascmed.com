import * as React from "react"
import {graphql, HeadProps, PageProps} from "gatsby"
import {Layout} from "../components/layouts/default";
import {ConditionsArchive} from "../components/conditions";
import {css} from "@emotion/react";
import {ConditionSummary} from "../components/conditions/conditions-archive";
import {Breadcrumbs} from "../components/breadcrumbs";
import {Container} from "../components/containers";
import {gridSpacing} from "../styles/theme";
import {PracticeArchive, PracticeSummary} from "../components/practices/practice-archive";
import {SEO} from "../components/seo";

const PracticesPage = ({ data }: PageProps<Queries.PracticesArchiveQuery>) => {
    const heading = data.copy?.childPagesYaml?.heading || "Practices"
    const text = data.copy?.childPagesYaml?.text || "";

    const practices: PracticeSummary[] = data.practices.edges.map(edge => ({
        slug: edge.node.fields?.slug || "",
        clinic_name: edge.node.frontmatter?.title || "Untitled Clinic",
        longitude: edge.node.frontmatter?.lon || 0,
        latitude: edge.node.frontmatter?.lat || 0,
        address: edge.node.frontmatter?.address || "",
        phone: edge.node.frontmatter?.phone || "",
        fax: edge.node.frontmatter?.fax || "",
    }));

    return (
        <Layout>
            <main>
                <Container>
                    <Breadcrumbs path={[
                        ["/", "Home"],
                        ["/clinics/", "Clinics"]
                    ]} css={css({marginTop: "3em"})} />
                    <PracticeArchive
                        practices={practices} heading={heading}
                        text={text}
                        isHomePage={false}
                        css={css({margin: `0 -${gridSpacing/2}em`})}
                    />
                </Container>
            </main>
        </Layout>
    )
}

export const Head = (props: HeadProps<Queries.PracticesArchiveQuery>) => {
    const description = props.data.copy?.childPagesYaml?.meta_description || "";
    const heading = props.data.copy?.childPagesYaml?.heading || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={heading}>
            <meta name={"og:type"} content={"website"} />
        </SEO>
    )
}


export const query = graphql`
  query PracticesArchive {
    copy: file(relativePath: {eq: "pages/clinics.yml"}) {
      childPagesYaml {
        heading
        text
        meta_description
      }
    }

    practices: allMdx(filter: {fields: {post_type: {eq: "clinics"}}}) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            title
            lat
            lon
            address
            phone
            fax
          }
        }
      }
    }
  }
`

export default PracticesPage