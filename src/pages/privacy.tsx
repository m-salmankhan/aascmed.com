import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol } from "../components/layouts/main-side-column";
import { Article } from "../components/posts/article";
import { H1, H4 } from "../components/headings";
import ReactMarkdown from "react-markdown";
import { SEO } from "../components/seo";

const PrivacyPage = ({ data, location, children }: PageProps<Queries.PrivacyPageQuery>) => {
    const heading = data.copy?.childPagesYaml?.heading || "Privacy Policy";
    const text = data.copy?.childPagesYaml?.text || "";

    return (
        <PrimarySecondaryColumnsLayout>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/privacy/", heading],
                ]} css={css({ marginTop: "3em" })} />
                <Article>
                    <Columns>
                        <MainCol>
                            <H1>{heading}</H1>
                            <ReactMarkdown>
                                {text}
                            </ReactMarkdown>
                            <p>Last Updated: {data.copy?.childPagesYaml?.lastUpdated}</p>
                            <p>We may change this privacy policy. If we change this policy, the above date will be amended to reflect the update.</p>
                        </MainCol>
                    </Columns>
                </Article>
            </main>
        </PrimarySecondaryColumnsLayout>
    )
}

export const Head = (props: HeadProps<Queries.PrivacyPageQuery>) => {
    const description = props.data.copy?.childPagesYaml?.meta_description || "";
    const heading = props.data.copy?.childPagesYaml?.heading || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={heading}>
            <meta name={"og:type"} content={"article"} />
        </SEO>
    )
}
export const query = graphql`
  query PrivacyPage {
    copy: file(relativePath: {eq: "pages/privacy.yml"}) {
      childPagesYaml {
        heading
        text
        meta_description
        lastUpdated(formatString: "YYYY.MM.DD")
      }
    }
  }
`

export default PrivacyPage