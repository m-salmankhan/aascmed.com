import { graphql, HeadProps, PageProps } from "gatsby"
import { Layout } from "../components/layouts/default";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Container } from "../components/containers";
import { gridSpacing } from "../styles/theme";
import { PracticeArchive, PracticeSummary } from "../components/practices/practice-archive";
import { SEO, usePageTitle } from "../components/seo";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";

const PracticesPage = ({ data }: PageProps<Queries.PracticesArchiveQuery>) => {
  const archiveCopy = data.strapiClinicsArchive;
  const heading = archiveCopy?.heading || "Clinics";
  const pageTitle = usePageTitle(heading);
  
  // Parse text blocks from internal.content
  const rawContent = archiveCopy?.internal?.content;
  const parsedData = rawContent ? JSON.parse(rawContent) : null;
  const textBlocks = parsedData?.text as any[] | null;

  const practices: PracticeSummary[] = data.practices.nodes.map(clinic => ({
    slug: `/clinics/${(clinic.clinic_name || "").toLowerCase().replace(/\s+/g, '-')}/`,
    clinic_name: clinic.clinic_name || "Untitled Clinic",
    longitude: clinic.location?.long || 0,
    latitude: clinic.location?.lat || 0,
    address: clinic.location?.address || "",
    phone: clinic.contact?.phone || "",
    fax: clinic.contact?.fax || "",
  }));

  return (
    <Layout pageTitle={pageTitle}>
      <main>
        <Container>
          <Breadcrumbs path={[
            ["/", "Home"],
            ["/clinics/", "Clinics"]
          ]} css={css({ marginTop: "3em" })} />
          <PracticeArchive
            practices={practices} heading={heading}
            textContent={textBlocks ? <StrapiBlocksRenderer content={textBlocks} /> : undefined}
            isHomePage={false}
            lazyLoad={false}
            css={css({ margin: `0 -${gridSpacing / 2}em` })}
          />
        </Container>
      </main>
    </Layout>
  )
}

export const Head = (props: HeadProps<Queries.PracticesArchiveQuery>) => {
  const description = props.data.strapiClinicsArchive?.metaDescription || "";
  const heading = props.data.strapiClinicsArchive?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}


export const query = graphql`
  query PracticesArchive {
    strapiClinicsArchive {
      heading
      metaDescription
      internal {
        content
      }
    }

    practices: allStrapiClinic {
      nodes {
        clinic_name
        location {
          address
          lat
          long
        }
        contact {
          phone
          fax
        }
      }
    }
  }
`

export default PracticesPage