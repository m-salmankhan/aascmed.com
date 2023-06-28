import * as React from "react"
import {graphql, Link, PageProps} from "gatsby"
import { MDXProvider } from "@mdx-js/react";
import {H1} from "../components/headings";
import {Container} from "../components/containers";
import {Columns, MainCol, SideCol, TwoColLayout} from "../components/layouts/two-col";
import {Breadcrumbs} from "../components/breadcrumbs";
import {css} from "@emotion/react";
import {ShareButtons} from "../components/social-media/share";
import {Contents, ContentsPageItem} from "../components/posts/contents";

const ButtonList = (props) => <div {...props}/>
const ContactUsBanner = (props) => <div {...props}/>

const shortcodes = { Link, ButtonList, ContactUsBanner};
const Conditions = ({ data, children, location }: PageProps<Queries.ConditionPageQuery>) => {
    if((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");

    const title = data.mdx.frontmatter.title || "Untitled"
    const tocItems = data.mdx.tableOfContents.items as ContentsPageItem[];

    return (
        <TwoColLayout>
            <main>
                <Breadcrumbs path={[
                    ["'", "Home"],
                    ["/conditions/", "Conditions"],
                    [data.mdx.fields.slug, title]
                ]} css={css({marginTop: "3em"})} />
                <article>
                    <H1><>{title}</></H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />

                    <Columns>
                        <MainCol>
                                <MDXProvider components={shortcodes as any}>
                                    {children}
                                </MDXProvider>
                                <footer>
                                    <ShareButtons pageTitle={title} path={location.pathname} />
                                </footer>
                        </MainCol>
                        <SideCol>
                            {/*<pre>{JSON.stringify(data, null, 2)}</pre>*/}
                            <Contents items={tocItems} />
                            {/*{data.mdx.tableOfContents}*/}
                        </SideCol>
                    </Columns>
                </article>
            </main>
        </TwoColLayout>
    );
}

export const query = graphql`
  query ConditionPage($id: String) {
    mdx(id: {eq: $id}) {
      id
      tableOfContents(maxDepth: 2)
      fields {
        slug
      }
      frontmatter {
        description
        title
      }
    }
  }
`

export default Conditions