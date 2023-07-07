import {Navigation} from "./navigation";
import {colours} from "../../styles/theme";
import {css} from "@emotion/react";
import {graphql, useStaticQuery} from "gatsby";
import {Container} from "../containers";

const stylesNavBar = css({
    background: colours.brandGradient,
});

export const NavBar = () => {
    return (
        <header css={stylesNavBar}>
            <Container>
                <Navigation frontPage={false} css={css({padding: "1em 0"})}/>
            </Container>
        </header>
    );
}