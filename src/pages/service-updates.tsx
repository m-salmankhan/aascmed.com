import { graphql, HeadProps, PageProps } from "gatsby";
import React from "react";
import { Layout } from "../components/layouts/default";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Container } from "../components/containers";
import { ServiceUpdateArchive } from "../components/service-updates";
import { ServiceUpdateSummary } from "../components/service-updates/service-update-archive";
import { gridSpacing } from "../styles/theme";
import { SEO } from "../components/seo";

const ServiceUpdatePage: React.FC<PageProps<Queries.ServiceUpdatesQuery>> = ({ data }) => {
  const serviceUpdatesCopy = data.sectionCopy?.childPagesYaml;
  const serviceUpdatesTitle = serviceUpdatesCopy?.heading || "Service Updates"
  const serviceUpdatesText = serviceUpdatesCopy?.text || "";
  const serviceUpdates: ServiceUpdateSummary[] = data.serviceUpdates.edges.map(edge => ({
    slug: edge.node.fields?.slug || "",
    title: edge.node.frontmatter?.title || "Untitled",
    date: edge.node.frontmatter?.date || "",
    description: edge.node.frontmatter?.description || "",
  }));
  return (
    <Layout>
      <Container>
        <Breadcrumbs path={[
          ["/", "Home"],
          ["/service-updates/", "Service Updates"]
        ]} css={css({ marginTop: "3em" })} />
        <ServiceUpdateArchive
          heading={serviceUpdatesTitle}
          text={serviceUpdatesText}
          serviceUpdates={serviceUpdates}
          frontPage={false}
          css={css({
            margin: `0 -${gridSpacing / 2}em`,
          })}
        />
      </Container>
    </Layout>
  )
}

export const Head = (props: HeadProps<Queries.ServiceUpdatesQuery>) => {
  const description = props.data.sectionCopy?.childPagesYaml?.meta_description || "";
  const heading = props.data.sectionCopy?.childPagesYaml?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export default ServiceUpdatePage;

export const query = graphql`
  query ServiceUpdates {
    sectionCopy: file(relativePath: {eq: "pages/service-updates.yml"}) {
      childPagesYaml {
        meta_description
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

