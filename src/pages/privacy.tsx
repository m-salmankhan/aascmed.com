import { graphql, HeadProps, PageProps } from "gatsby";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { mapGatsbyText } from "../shared/content/gatsby-adapter";
import { PrivacyView } from "../views/fixed-archive";

const PrivacyPage = ({ data }: PageProps<Queries.PrivacyPageQuery>) => {
  const page = data.strapiPrivacyPolicy;
  const lastUpdated = page?.updatedAt ? new Date(page.updatedAt).toISOString().split("T")[0].replace(/-/g, ".") : undefined;
  return <PrivacyView heading={page?.title || "Privacy Policy"} blocks={mapGatsbyText(page || {})} lastUpdated={lastUpdated} />;
};

export const Head = (props: HeadProps<Queries.PrivacyPageQuery>) => {
  const description = props.data.strapiPrivacyPolicy?.description || "";
  const heading = props.data.strapiPrivacyPolicy?.title || "";
  return <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
    <meta name="og:type" content="article" />
  </SEO>;
};

export const query = graphql`
  query PrivacyPage {
    strapiPrivacyPolicy {
      title
      description
      updatedAt
      internal { content }
    }
  }
`;

export default PrivacyPage;
