import * as React from "react"
import { graphql } from "gatsby"
import {App} from "../components/layouts/app";

const Provider = ({ data }) => {
    return (
        <App>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </App>
    );
}

export const query = graphql`
  query ($id: String) {
    mdx(id: {eq: $id}) {
      id
      frontmatter {
        description
        review
        image {
          childImageSharp {
            fluid(maxWidth: 700) {
              ...GatsbyImageSharpFluid
            }
          }
        }
        name {
          fullname
          title
          degree
          degree_abbr
        }
      }
      fields {
        slug
      }
      body
    }
  }
`

export default Provider