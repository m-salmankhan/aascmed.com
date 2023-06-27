import {Navigation} from "./navigation";
import {colours} from "../../styles/theme";
import {css} from "@emotion/react";
import {graphql, useStaticQuery} from "gatsby";
import {Container} from "../containers";

const stylesNavBar = css({
    background: colours.brandGradient,
});

export const NavBar = () => {
    const data = useStaticQuery(graphql`
        query SiteTitle {
          site {
            siteMetadata {
              title
            }
          }
        }
      `);

    return (
        <header css={stylesNavBar}>
            <Container>
                <Navigation siteTitle={data.site.siteMetadata.title} frontPage={false} css={css({padding: "1em 0"})}/>
            </Container>
        </header>
    );
}