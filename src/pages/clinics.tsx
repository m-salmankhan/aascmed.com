import { graphql, HeadProps, PageProps } from "gatsby"
import { Layout } from "../components/layouts/default";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Container } from "../components/containers";
import { gridSpacing } from "../styles/theme";
import { PracticeArchive, PracticeSummary } from "../components/practices/practice-archive";
import { SEO } from "../components/seo";

const PracticesPage = ({ data }: PageProps<Queries.PracticesArchiveQuery>) => {
  const heading = data.copy?.childPagesYaml?.heading || "Practices"
  const text = data.copy?.childPagesYaml?.text || "";

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
    <Layout>
      <main>
        <Container>
          <Breadcrumbs path={[
            ["/", "Home"],
            ["/clinics/", "Clinics"]
          ]} css={css({ marginTop: "3em" })} />
          <PracticeArchive
            practices={practices} heading={heading}
            text={text}
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
  const description = props.data.copy?.childPagesYaml?.meta_description || "";
  const heading = props.data.copy?.childPagesYaml?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
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