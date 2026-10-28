import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyClinic, mapGatsbyText } from "../shared/content/gatsby-adapter";
import { clinicPath } from "../shared/content/urls";
import type { PracticeSummary } from "../components/practices/practice-archive";
import { ClinicsArchiveView } from "../views/fixed-archive";

const PracticesPage = ({ data }: PageProps<Queries.PracticesArchiveQuery>) => {
  const archive = data.strapiClinicsArchive;
  const practices: PracticeSummary[] = data.practices.nodes.map((node) => {
    const clinic = mapGatsbyClinic({ id: node.id, slug: node.slug, clinic_name: node.clinic_name,
      location: node.location, contact: node.contact });
    return {
      slug: clinicPath(clinic) || "/clinics/",
      clinic_name: clinic.clinicName || "Untitled Clinic",
      longitude: clinic.location?.longitude || 0,
      latitude: clinic.location?.latitude || 0,
      address: clinic.location?.address || "",
      phone: clinic.contact?.phone || "",
      fax: clinic.contact?.fax || "",
    };
  });
  return <ClinicsArchiveView heading={archive?.heading || "Clinics"} blocks={mapGatsbyText(archive || {})} practices={practices} />;
};

export const Head = (props: HeadProps<Queries.PracticesArchiveQuery>) => {
  const description = props.data.strapiClinicsArchive?.metaDescription || "";
  const heading = props.data.strapiClinicsArchive?.heading || "";
  return <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
    <meta name="og:type" content="website" />
  </SEO>;
};

export const query = graphql`
  query PracticesArchive {
    strapiClinicsArchive { heading metaDescription internal { content } }
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

export default PracticesPage;
