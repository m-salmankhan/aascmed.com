import { HeadProps, Link, PageProps } from "gatsby"
import { Layout } from "../components/layouts/default";
import { css } from "@emotion/react";
import { Container } from "../components/containers";
import { SEO } from "../components/seo";
import { stylesBigH1 } from "../components/headings";
import { Logo } from "../components/logo";
import { colours } from "../styles/theme";

const NotFoundPage = ({ data }: PageProps<Queries.PracticesArchiveQuery>) => {
    return (
        <Layout>
            <main>
                <Container css={css({ minHeight: "50vh", textAlign: "center", marginTop: "5em" })}>
                    <Logo css={{ fill: colours.brandPrimary }} />
                    <h1 css={stylesBigH1}>Page Not Found!</h1>
                    <p>The URL you have entered may be incorrect, or this page has been removed.</p>
                    <p>If this appears to be a mistake, please <Link to="/contact/">contact us</Link></p>
                </Container>
            </main>
        </Layout >
    )
}

export const Head = (props: HeadProps) => {
    return (
        <SEO description={"This page could not be found."} slug={props.location.pathname} title={"404 Not Found"}>
            <meta name={"og:type"} content={"website"} />
        </SEO>
    )
}


export default NotFoundPage