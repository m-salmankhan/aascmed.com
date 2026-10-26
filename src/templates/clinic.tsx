import React from "react";
import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyClinic } from "../shared/content/gatsby-adapter";
import { ClinicView } from "../views/clinic";

const Clinic = ({ data }: PageProps<Queries.ClinicQuery>) => <ClinicView
  clinic={data.strapiClinic ? mapGatsbyClinic(data.strapiClinic) : undefined}
/>;

export const Head = (props: HeadProps<Queries.ClinicQuery, { ogImagePath?: string }>) => {
  const pageTitle = props.data.strapiClinic?.title || "Untitled";
  const description = props.data.strapiClinic?.description || "";
  return <SEO description={description} slug={props.location.pathname} title={pageTitle} image={props.pageContext.ogImagePath || undefined} useTracking appendBusinessNameToTitle={false}>
    <meta name="og:type" content="website" />
  </SEO>;
};

export const query = graphql`
  query Clinic($id: String) {
    strapiClinic(id: {eq: $id}) {
      id
      title
      clinic_name
      description
      internal { content }
      hours {
        day
        open
        opening_hours { start_time end_time }
        shot_hours { start_time end_time }
      }
      contact { phone fax }
      location { address lat long placeId label_name }
    }
  }
`;

export default Clinic;
