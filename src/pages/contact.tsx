import { graphql, HeadProps, PageProps } from "gatsby"
import { Layout } from "../components/layouts/default";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Container } from "../components/containers";
import { gridSpacing } from "../styles/theme";
import { PracticeArchive, PracticeSummary } from "../components/practices/practice-archive";
import { ContactSection } from "../components/contact/full-form";
import { SEO } from "../components/seo";

const ContactPage = ({ data }: PageProps<Queries.ContactPageQuery>) => {
  const heading = data.copy?.childPagesYaml?.heading || "Contact Us";
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
            ["/contact/", "Contact Us"]
          ]} css={css({ marginTop: "3em" })} />
          <ContactSection
            title={heading}
            text={text}
            css={css`margin: 0 -${gridSpacing / 2}rem`}
          />
          <PracticeArchive
            practices={practices} heading={"Practice Locations"}
            text={""}
            isHomePage={true}
            css={css({ margin: `0 -${gridSpacing / 2}em` })}
          />
        </Container>
      </main>
    </Layout>
  )
}

export const Head = (props: HeadProps<Queries.ContactPageQuery>) => {
  const description = props.data.copy?.childPagesYaml?.meta_description || "";
  const heading = props.data.copy?.childPagesYaml?.heading || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export const query = graphql`
  query ContactPage {
    copy: file(relativePath: {eq: "pages/contact.yml"}) {
      childPagesYaml {
        heading
        meta_description
        text
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

export default ContactPage