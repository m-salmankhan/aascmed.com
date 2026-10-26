import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyClinic, mapGatsbyText } from "../shared/content/gatsby-adapter";
import { clinicPath } from "../shared/content/urls";
import type { PracticeSummary } from "../components/practices/practice-archive";
import { ContactView } from "../views/fixed-archive";

const ContactPage = ({ data }: PageProps<Queries.ContactPageQuery>) => {
  const copy = data.strapiContact;
  const clinicOptions = data.practices.nodes.flatMap((node) => node?.clinic_name ? [node.clinic_name] : []);
  const practices: PracticeSummary[] = data.practices.nodes.flatMap((node) => {
    if (!node) return [];
    const clinic = mapGatsbyClinic({ id: node.id, slug: node.slug, clinic_name: node.clinic_name,
      location: node.location, contact: node.contact });
    return [{
      slug: clinicPath(clinic) || "/clinics/",
      clinic_name: clinic.clinicName || "Untitled Clinic",
      longitude: clinic.location?.longitude || 0,
      latitude: clinic.location?.latitude || 0,
      address: clinic.location?.address || "",
      phone: clinic.contact?.phone || "",
      fax: clinic.contact?.fax || "",
    }];
  });
  return <ContactView heading={copy?.heading || "Contact Us"} blocks={mapGatsbyText(copy || {})}
    practices={practices} clinicOptions={clinicOptions} />;
};

export const Head = (props: HeadProps<Queries.ContactPageQuery>) => {
  const description = props.data.strapiContact?.metaDescription || "";
  const heading = props.data.strapiContact?.heading || "";
  return <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
    <meta name="og:type" content="website" />
  </SEO>;
};

export const query = graphql`
  query ContactPage {
    strapiContact { heading metaDescription internal { content } }
    practices: allStrapiClinic {
      nodes {
        id
        clinic_name
        slug
        location { address lat long }
        contact { phone fax }
      }
    }
  }
`;

export default ContactPage;
