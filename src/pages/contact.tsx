import * as React from "react"
import {graphql, PageProps} from "gatsby"
import {Layout} from "../components/layouts/default";
import {ConditionsArchive} from "../components/conditions";
import {css} from "@emotion/react";
import {ConditionSummary} from "../components/conditions/conditions-archive";
import {Breadcrumbs} from "../components/breadcrumbs";
import {Container} from "../components/containers";
import {gridSpacing} from "../styles/theme";
import {PracticeArchive, PracticeSummary} from "../components/practices/practice-archive";
import {ContactSection} from "../components/contact/full-form";

const ContactPage = ({ data }: PageProps<Queries.PracticesArchiveQuery>) => {
    const heading = data.copy?.childPagesYaml?.heading || "Contact Us";
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
                        ["/contact/", "Contact Us"]
                    ]} css={css({marginTop: "3em"})} />
                    <ContactSection
                        title={heading}
                        text={text}
                        css={css`margin: 0 -${gridSpacing/2}rem`}
                    />
                    <PracticeArchive
                        practices={practices} heading={"Practice Locations"}
                        text={""}
                        isHomePage={true}
                        css={css({margin: `0 -${gridSpacing/2}em`})}
                    />
                </Container>
            </main>
        </Layout>
    )
}

export const query = graphql`
  query ContactPage {
    copy: file(relativePath: {eq: "pages/contact.yml"}) {
      childPagesYaml {
        heading
        text
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

export default ContactPage