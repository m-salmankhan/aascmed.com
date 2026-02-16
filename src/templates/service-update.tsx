import * as React from "react"
import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { H1 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Article } from "../components/posts/article";
import { ShareButtons } from "../components/social-media/share";
import { PrimaryAnchor, PrimaryButton, stylesBtnSecondary, stylesButton } from "../components/buttons";
import { gridSpacing } from "../styles/theme";
import { SEO } from "../components/seo";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";
import moment from "moment";

const ServiceUpdate = ({ data, location }: PageProps<Queries.ServiceUpdatePageQuery>) => {
    const [jsEnabled, setJsEnabled] = React.useState(false);
    React.useEffect(() => setJsEnabled(true), [setJsEnabled]);

    const serviceUpdate = data.strapiServiceUpdate;
    
    if (!serviceUpdate) {
        throw Error("Service update is undefined");
    }

    const title = serviceUpdate.title || "Untitled";
    const rawDate = serviceUpdate.date;
    const formattedDate = rawDate ? moment(rawDate).format("Do MMMM YYYY") : "";
    
    // Parse raw JSON content to get full rich text data
    const rawContent = serviceUpdate.internal?.content;
    const parsedData = rawContent ? JSON.parse(rawContent) : null;
    const body = parsedData?.body as any[] | undefined;
    
    // Build slug for breadcrumbs
    const date = rawDate ? moment(rawDate) : null;
    const slug = date 
        ? `/service-updates/${date.format('YYYY')}/${date.format('MM')}/${serviceUpdate.slug}/`
        : `/service-updates/${serviceUpdate.slug}/`;

    return (
        <PrimarySecondaryColumnsLayout>
            <main css={css`margin-bottom: 5rem;`}>
                <Breadcrumbs path={[
                    ["/", "Home"],
                    ["/service-updates/", "Service Updates"],
                    [slug, title]
                ]} css={css({ marginTop: "3em" })} />

                <Article css={css({ h3: { fontSize: "1rem" } })}>
                    <H1>{title}</H1>
                    <ShareButtons pageTitle={title} path={location.pathname} />
                    <p>{formattedDate}</p>
                    <Columns>
                        <MainCol>
                            {body && <StrapiBlocksRenderer content={body} />}
                            <footer>
                                {jsEnabled ?
                                    <PrimaryButton
                                        onClick={() => {
                                            history.back();
                                            return false;
                                        }}
                                        css={{ marginRight: gridSpacing / 2 + `em` }}>Go back</PrimaryButton> :
                                    <PrimaryAnchor css={{ marginRight: gridSpacing / 2 + `em` }} href={"/"}>Return to home</PrimaryAnchor>
                                }
                                <Link to={"/contact"} css={[stylesButton, stylesBtnSecondary]}>Get in touch</Link>
                            </footer>
                        </MainCol>
                    </Columns>
                </Article>
            </main>
        </PrimarySecondaryColumnsLayout>
    );
}


export const Head = (props: HeadProps<Queries.ServiceUpdatePageQuery>) => {
    const title = props.data.strapiServiceUpdate?.title || "Untitled";
    const description = props.data.strapiServiceUpdate?.description || "";

    return (
        <SEO description={description} slug={props.location.pathname} title={title} useTracking={true}>
            <meta name={"og:type"} content={"article"} />
            <meta name={"article:section"} content={"service-updates"} />
        </SEO>
    )
}

export const query = graphql`
  query ServiceUpdatePage ($id: String) {
    strapiServiceUpdate(id: {eq: $id}) {
      slug
      title
      description
      date
      internal {
        content
      }
    }
  }
`


export default ServiceUpdate