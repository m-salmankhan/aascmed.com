import * as React from "react"
import {graphql, Link, PageProps} from "gatsby"
import {css} from "@emotion/react";
import {Breadcrumbs} from "../components/breadcrumbs";
import {Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol} from "../components/layouts/main-side-column";
import {Article} from "../components/posts/article";
import {H1, H4} from "../components/headings";
import {ShareButtons} from "../components/social-media/share";
import {MDXProvider} from "@mdx-js/react";
import {ButtonList, ContactBanner} from "../components/posts/shortcode-components";
import ReactMarkdown from "react-markdown";

const PrivacyPage = ({ data, location, children }: PageProps<Queries.PrivacyPageQuery>) => {
    const heading = data.copy?.childPagesYaml?.heading || "Privacy Policy";
    const text = data.copy?.childPagesYaml?.text || "";

    return (
        <PrimarySecondaryColumnsLayout>
            <main>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/privacy/", heading],
                ]} css={css({marginTop: "3em"})} />
                <Article css={css({h3: {fontSize: "1rem"}})}>
                    <Columns>
                        <MainCol>
                            <H1>{heading}</H1>
                            <ReactMarkdown>
                                {text}
                            </ReactMarkdown>
                        </MainCol>
                    </Columns>
                </Article>
            </main>
        </PrimarySecondaryColumnsLayout>
    )
}

export const query = graphql`
  query PrivacyPage {
    copy: file(relativePath: {eq: "pages/privacy.yml"}) {
      childPagesYaml {
        heading
        text
      }
    }
  }
`

export default PrivacyPage