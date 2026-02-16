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
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";

const ServiceUpdatePage: React.FC<PageProps<Queries.ServiceUpdatesQuery>> = ({ data }) => {
  const archiveCopy = data.strapiServiceUpdatePage;
  const serviceUpdatesTitle = archiveCopy?.heading || "Service Updates";
  
  // Parse text blocks from internal.content
  const rawContent = archiveCopy?.internal?.content;
  const parsedData = rawContent ? JSON.parse(rawContent) : null;
  const textBlocks = parsedData?.text as any[] | null;

  const serviceUpdates: ServiceUpdateSummary[] = data.serviceUpdates.nodes.map(node => {
    const date = node.date ? new Date(node.date) : null;
    const year = date ? date.getFullYear() : '';
    const month = date ? String(date.getMonth() + 1).padStart(2, '0') : '';
    const slug = date 
      ? `/service-updates/${year}/${month}/${node.slug}/`
      : `/service-updates/${node.slug}/`;
    
    return {
      slug,
      title: node.title || "Untitled",
      date: node.formattedDate || "",
      description: node.description || "",
    };
  });
  return (
    <Layout>
      <Container>
        <Breadcrumbs path={[
          ["/", "Home"],
          ["/service-updates/", "Service Updates"]
        ]} css={css({ marginTop: "3em" })} />
        <ServiceUpdateArchive
          heading={serviceUpdatesTitle}
          textContent={textBlocks ? <StrapiBlocksRenderer content={textBlocks} /> : undefined}
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
  const description = props.data.strapiServiceUpdatePage?.metaDescription || "";
  const heading = props.data.strapiServiceUpdatePage?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export default ServiceUpdatePage;

export const query = graphql`
  query ServiceUpdates {
    strapiServiceUpdatePage {
      heading
      metaDescription
      internal {
        content
      }
    }
    serviceUpdates: allStrapiServiceUpdate(sort: {date: DESC}) {
      nodes {
        slug
        title
        description
        date
        formattedDate: date(formatString: "Do MMMM YYYY")
      }
    }
  }
`

