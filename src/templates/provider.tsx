import React from "react";
import { graphql, HeadProps, Link, PageProps } from "gatsby"
import { Columns, MainCol, SideCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Breadcrumbs } from "../components/breadcrumbs";
import { css } from "@emotion/react";
import { Article } from "../components/posts/article";
import { H1, H4 } from "../components/headings";
import { ShareButtons } from "../components/social-media/share";
import { InfoNotice } from "../components/posts/shortcode-components";
import { GatsbyImage } from "gatsby-plugin-image";
import { SEO } from "../components/seo";
import { StrapiDynamicZoneRenderer, StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";

const stylesImage = css({
  width: "70%",
  height: "auto",
  borderRadius: "50%",
  overflow: "hidden",
});

const Provider = ({ data, location }: PageProps<Queries.ProviderPageQuery>) => {
  const provider = data.strapiProvider;
  
  if (!provider) {
    throw Error("Provider is undefined");
  }

  const name = provider.name?.fullName || "Untitled";
  const honorific = provider.name?.honorific && provider.name.honorific !== "None" 
    ? provider.name.honorific 
    : "";
  const degreeAbbr = provider.name?.qualificationAbbr || "";

  const retired = provider.retirementNotice?.retired || false;
  
  // Parse raw JSON content to get full rich text data with all formatting
  const rawContent = provider.internal?.content;
  const parsedData = rawContent ? JSON.parse(rawContent) : null;
  const body = parsedData?.body as any[] | undefined;
  const retirementText = parsedData?.retirementNotice?.text as any[] | undefined;

  const image = provider.image?.localFile?.childImageSharp?.gatsbyImageData;
  const slug = `/providers/${provider.slug}/`;
  
  // Get review data
  const review = provider.review;

  const pageTitle = `${honorific} ${name}`.trim();
  const pageHeading = degreeAbbr ? `${name}, ${degreeAbbr}` : name;

  return (
    <PrimarySecondaryColumnsLayout>
      <main>
        <Breadcrumbs path={[
          ["/", "Home"],
          ["/providers/", "Providers"],
          [slug, name]
        ]} css={css({ marginTop: "3em", marginBottom: "1em" })} />
        <Article css={css({ h3: { fontSize: "1rem" } })}>
          <Columns>
            <MainCol>
              <H1><>{pageHeading}</></H1>
              <ShareButtons pageTitle={pageTitle} path={location.pathname} />

              <RetirementNotice retired={retired} noticeBlocks={retirementText} />              

              {body && <StrapiDynamicZoneRenderer content={body} />}
              
              <footer>
                <ShareButtons pageTitle={pageTitle} path={location.pathname} />
              </footer>
            </MainCol>
            <SideCol>
              <aside>
                {
                  image &&
                  <GatsbyImage css={stylesImage} alt={`A photo of ${honorific} ${name}`.trim()} image={image} />
                }
                {
                  review && (
                    <>
                      <H4>Featured Review</H4>
                      <p>{review.text}</p>
                      <p>{review.reviewer} - <Link to={review.link}>{review.date}</Link></p>
                    </>
                  )
                }
              </aside>
            </SideCol>
          </Columns>
        </Article>
      </main>
    </PrimarySecondaryColumnsLayout>
  );
}

const RetirementNotice = ({retired, noticeBlocks}: {retired: boolean, noticeBlocks?: any[]}) => {
  if (!retired || !noticeBlocks || noticeBlocks.length === 0) return null;
  
  return (
    <InfoNotice css={css`margin-bottom: 1em;`}>
      <StrapiBlocksRenderer content={noticeBlocks} />
    </InfoNotice>
  );
}


export const Head = (props: HeadProps<Queries.ProviderPageQuery>) => {
  const provider = props.data.strapiProvider;
  const name = provider?.name?.fullName || "Untitled";
  const honorific = provider?.name?.honorific && provider.name.honorific !== "None" 
    ? provider.name.honorific 
    : "";

  const pageTitle = `${honorific} ${name}`.trim();
  const description = provider?.description || "";
  const image = provider?.image?.localFile?.publicURL || undefined;

  return (
    <SEO description={description} slug={props.location.pathname} title={pageTitle} image={image} useTracking={true}>
      <meta name={"og:type"} content={"profile"} />
    </SEO>
  )
}

export const query = graphql`
  query ProviderPage($id: String) {
    strapiProvider(id: {eq: $id}) {
      id
      slug
      description
      internal {
        content
      }
      name {
        fullName
        honorific
        qualificationLong
        qualificationAbbr
      }
      retirementNotice {
        retired
      }
      review {
        text
        reviewer
        date(formatString: "MMMM D, YYYY")
        link
      }
      image {
        localFile {
          childImageSharp {
            gatsbyImageData(
              layout: FULL_WIDTH
              aspectRatio: 1
            )
          }
          publicURL
        }
      }
    }
  }
`

export default Provider