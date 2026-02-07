import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol } from "../components/layouts/main-side-column";
import { Article } from "../components/posts/article";
import { H1 } from "../components/headings";
import { SEO, usePageTitle } from "../components/seo";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";

const PrivacyPage = ({ data, location, children }: PageProps<Queries.PrivacyPageQuery>) => {
    const privacyData = data.strapiPrivacyPolicy;
    const heading = privacyData?.title || "Privacy Policy";
    const pageTitle = usePageTitle(heading);
    
    // Parse text blocks from internal.content
    const rawContent = privacyData?.internal?.content;
    const parsedData = rawContent ? JSON.parse(rawContent) : null;
    const textBlocks = parsedData?.text as any[] | null;
    
    // Use Strapi's updatedAt metadata for last updated date
    const lastUpdated = privacyData?.updatedAt 
        ? new Date(privacyData.updatedAt).toISOString().split('T')[0].replace(/-/g, '.')
        : null;

    return (
        <PrimarySecondaryColumnsLayout pageTitle={pageTitle}>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/privacy/", heading],
                ]} css={css({ marginTop: "3em" })} />
                <Article>
                    <Columns>
                        <MainCol>
                            <H1>{heading}</H1>
                            {textBlocks && <StrapiBlocksRenderer content={textBlocks} />}
                            {lastUpdated && <p>Last Updated: {lastUpdated}</p>}
                            <p>We may change this privacy policy. If we change this policy, the above date will be amended to reflect the update.</p>
                        </MainCol>
                    </Columns>
                </Article>
            </main>
        </PrimarySecondaryColumnsLayout>
    )
}

export const Head = (props: HeadProps<Queries.PrivacyPageQuery>) => {
    const description = props.data.strapiPrivacyPolicy?.description || "";
    const heading = props.data.strapiPrivacyPolicy?.title || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={heading} useTracking={true}>
            <meta name={"og:type"} content={"article"} />
        </SEO>
    )
}
export const query = graphql`
  query PrivacyPage {
    strapiPrivacyPolicy {
      title
      description
      updatedAt
      internal {
        content
      }
    }
  }
`

export default PrivacyPage