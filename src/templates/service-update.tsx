import * as React from "react"
import {graphql, Link, PageProps} from "gatsby"
import { MDXProvider } from "@mdx-js/react";
import {H1} from "../components/headings";

const ButtonList = (props) => <div {...props}/>
const ContactUsBanner = (props) => <div {...props}/>

const shortcodes = { Link, ButtonList, ContactUsBanner};
const Conditions = ({ data, children }: PageProps<Queries.ServiceUpdatePageQuery>, pageContext, location) => {
    // <pre>{JSON.stringify(data, null, 2)}</pre>
    if((data.mdx === null) || (data.mdx === undefined))
        throw Error("mdx is undefined");

    if((data.mdx.frontmatter === null) || (data.mdx.frontmatter === undefined))
        throw Error("Frontmatter is undefined");

    const title = data.mdx.frontmatter.title || "Untitled"
    const date = data.mdx.frontmatter.date || ""
    const description = data.mdx.frontmatter.description || ""

    return (
        <article>
            <H1>{title}</H1>
            <p>{date}</p>
            <p>{description}</p>
            <MDXProvider components={shortcodes as any}>
                {children}
            </MDXProvider>
        </article>
    );
}

export const query = graphql`
  query ServiceUpdatePage ($id: String) {
    mdx(id: {eq: $id}) {
      frontmatter {
        date(formatString: "Do MMMM YYYY")
        title
        description
      }
    }
  }
`


export default Conditions