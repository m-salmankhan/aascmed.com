import {graphql, PageProps} from "gatsby";
import React from "react";
import {Layout} from "../components/layouts/default";
import {Breadcrumbs} from "../components/breadcrumbs";
import {css} from "@emotion/react";
import {Container} from "../components/containers";
import {ServiceUpdateArchive} from "../components/service-updates";
import {ServiceUpdateSummary} from "../components/service-updates/service-update-archive";

const ServiceUpdatePage: React.FC = ({ data, location }: PageProps<Queries.ServiceUpdatePageQuery>) => {
    const serviceUpdatesCopy = data.sectionCopy.childPagesYaml;
    const serviceUpdatesTitle = serviceUpdatesCopy.heading || "Service Updates"
    const serviceUpdatesText = serviceUpdatesCopy.text || "";
    const serviceUpdates: ServiceUpdateSummary[] = data.serviceUpdates.edges.map(edge => ({
        slug: edge.node.fields.slug,
        title: edge.node.frontmatter.title,
        date: edge.node.frontmatter.date,
        description: edge.node.frontmatter.description,
    }));
    return (
        <Layout>
            <Container>
                <Breadcrumbs path={[
                    ["'", "Home"],
                    ["/service-updates/", "Service Updates"]
                ]} css={css({marginTop: "3em"})} />
                <ServiceUpdateArchive heading={serviceUpdatesTitle} text={serviceUpdatesText} serviceUpdates={serviceUpdates} frontPage={false}/>
            </Container>
        </Layout>
    )
}

export default ServiceUpdatePage;

export const query = graphql`
  query ServiceUpdates {
    sectionCopy: file(relativePath: {eq: "pages/service-updates.yml"}) {
      childPagesYaml {
        heading
        text
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

