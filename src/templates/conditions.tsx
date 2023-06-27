import * as React from "react"
import {graphql, Link, PageProps} from "gatsby"
import { MDXProvider } from "@mdx-js/react";
import {H1} from "../components/headings";
import {App} from "../components/layouts/app";
import {Layout} from "../components/layouts/default";
import {Container} from "../components/containers";

const ButtonList = (props) => <div {...props}/>
const ContactUsBanner = (props) => <div {...props}/>

const shortcodes = { Link, ButtonList, ContactUsBanner};
const Conditions = ({ data, children }: PageProps<Queries.ConditionPageQuery>, pageContext, location) => {
    // <pre>{JSON.stringify(data, null, 2)}</pre>
    if((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");

    const title = data.mdx.frontmatter.title || "Untitled"

    return (
        <Layout>
            <main>
                <Container>
                    <article>
                        <H1><>{title}</></H1>
                        <MDXProvider components={shortcodes as any}>
                            {children}
                        </MDXProvider>
                    </article>
                </Container>
            </main>
        </Layout>
    );
}

export const query = graphql`
  query ConditionPage($id: String) {
    mdx(id: {eq: $id}) {
      id
      tableOfContents(maxDepth: 2)
      frontmatter {
        description
        title
      }
    }
  }
`

export default Conditions