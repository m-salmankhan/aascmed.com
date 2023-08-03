import React from "react";
import { graphql, HeadProps, PageProps, Script } from "gatsby";
import { Hero } from "../components/header";
import { css } from "@emotion/react";
import { ConditionsArchive } from "../components/conditions/";
import { ConditionSummary } from "../components/conditions/conditions-archive";
import { ServiceUpdateArchive } from "../components/service-updates";
import { ServiceUpdateSummary } from "../components/service-updates/service-update-archive";
import { App } from "../components/layouts/app";
import { ProvidersArchiveHomePageLayout, ProviderSummary } from "../components/providers";
import { PatientFeedback } from "../components/patient-feedback";
import { Review } from "../components/patient-feedback/reviews";
import { Container } from "../components/containers";
import { PracticeArchive, PracticeSummary } from "../components/practices/practice-archive";
import { ContactSection } from "../components/contact/full-form";
import { SEO } from "../components/seo";
import { Footer } from "../components/footer";

const IndexPage: React.FC<PageProps<Queries.IndexPageQuery>> = ({ data }) => {
  const heroImage = data.heroImage?.childImageSharp?.gatsbyImageData;
  const siteTitle = data.siteTitle?.siteMetadata?.title || "Allergy Asthma and Sinus Centres";

  const heroCopy = data?.sectionCopy?.childPagesYaml?.hero;
  const heroTitle = heroCopy?.heading || siteTitle;
  const heroText = heroCopy?.text || "";

  const conditionsCopy = data.sectionCopy?.childPagesYaml?.conditions;
  const conditionsTitle = conditionsCopy?.heading || "Learn more about the conditions we treat."
  const conditionsText = conditionsCopy?.text || "";
  const conditions: ConditionSummary[] = data.conditions.edges.map(edge => ({
    slug: edge.node.fields?.slug || "",
    title: edge.node.frontmatter?.heading || "",
    thumbnail: edge.node.frontmatter?.thumbnail?.childImageSharp?.gatsbyImageData,
  }));

  const serviceUpdatesCopy = data.sectionCopy?.childPagesYaml?.service_updates;
  const serviceUpdatesTitle = serviceUpdatesCopy?.heading || "Service Updates"
  const serviceUpdatesText = serviceUpdatesCopy?.text || "";
  const serviceUpdates: ServiceUpdateSummary[] = data.serviceUpdates.edges.map(edge => ({
    slug: edge.node.fields?.slug || "",
    title: edge.node.frontmatter?.title || "",
    date: edge.node.frontmatter?.date || "",
    description: edge.node.frontmatter?.description || "",
  }));

  const providersCopy = data.sectionCopy?.childPagesYaml?.providers;
  const providersTitle = providersCopy?.heading || "Meet the team"
  const providersText = providersCopy?.text || "";
  const providers: ProviderSummary[] = data.providers.edges.map(edge => ({
    slug: edge.node.fields?.slug || "",
    name: {
      fullName: edge.node.frontmatter?.name?.fullname || "",
      title: edge.node.frontmatter?.name?.title || "",
      degreeAbbr: edge.node.frontmatter?.name?.degree_abbr || "",
    },
    image: edge.node.frontmatter?.image?.childImageSharp?.gatsbyImageData,
  }));

  const avgRating = {
    rating: data.sectionCopy?.childPagesYaml?.patient_feedback?.rating || 0,
    source: {
      name: data.sectionCopy?.childPagesYaml?.patient_feedback?.source_name || "",
      url: data.sectionCopy?.childPagesYaml?.patient_feedback?.source_url || "",
    },
    date: data.sectionCopy?.childPagesYaml?.patient_feedback?.access_date || "",
  };

  const reviews: Review[] = data.reviews.edges.map(edge => ({
    stars: edge.node.frontmatter?.stars || 0,
    body: edge.node.body,
    source: {
      url: edge.node.frontmatter?.source?.url || "",
      name: edge.node.frontmatter?.source?.name || "",
    },
    reviewerName: edge.node.frontmatter?.reviewerName || "",
  }));

  const practicesCopy = data.sectionCopy?.childPagesYaml?.practices;
  const practicesTitle = practicesCopy?.heading || "Practices"
  const practicesText = practicesCopy?.text || "";
  const practices: PracticeSummary[] = data.practices.edges.map(edge => ({
    slug: edge.node.fields?.slug || "",
    clinic_name: edge.node.frontmatter?.clinic_name || "Untitled Clinic",
    longitude: edge.node.frontmatter?.lon || 0,
    latitude: edge.node.frontmatter?.lat || 0,
    address: edge.node.frontmatter?.address || "",
    phone: edge.node.frontmatter?.phone || "",
    fax: edge.node.frontmatter?.fax || "",
  }));

  const contactCopy = data.sectionCopy?.childPagesYaml?.contact;
  const contactTitle = contactCopy?.heading || "Contact Us"
  const contactText = contactCopy?.text || "";

  return (
    <App>
      <Hero image={heroImage} heading={heroTitle} text={heroText} />
      <main id={"main"}>
        <Container>
          <ConditionsArchive showViewAll={true} heading={conditionsTitle} text={conditionsText} frontPage={true} conditionsList={conditions} css={css({ marginTop: "5em", })} />
          <ServiceUpdateArchive serviceUpdates={serviceUpdates} frontPage={true} heading={serviceUpdatesTitle} text={serviceUpdatesText} css={css({ marginTop: "4em", })} />
          <ProvidersArchiveHomePageLayout providers={providers} heading={providersTitle} text={providersText} css={css({ marginTop: "4em", })} />
        </Container>
        <PatientFeedback css={css({ marginTop: "5em", })} averageRating={avgRating} reviews={reviews} />
        <Container>
          <ContactSection css={css({ marginTop: "5em", })} title={contactTitle} text={contactText} />
          <PracticeArchive css={css({ marginTop: "5em", })} practices={practices} heading={practicesTitle} text={practicesText} isHomePage={true} />
        </Container>
      </main>
      <Footer />
      <Script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></Script>
      <script dangerouslySetInnerHTML={{
        __html: `
        if (window.netlifyIdentity) {
          window.netlifyIdentity.on('init', user => {
            if (!user) {
              window.netlifyIdentity.on('login', () => {
                document.location.href = '/admin/';
              });
            }
          });
        }
      `}} />
    </App>
  );
}

export const Head = (props: HeadProps<Queries.IndexPageQuery>) => {
  const description = props.data.sectionCopy?.childPagesYaml?.meta_description || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={"Allergy, Asthma and Sinus Centers in Illinois"} appendBusinessNameToTitle={false}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export default IndexPage

export const query = graphql`
  query IndexPage {
    sectionCopy: file(relativePath: {eq: "pages/home.yml"}) {
      childPagesYaml {
        meta_description
        conditions {
          heading
          text
        }
        hero {
          heading
          text
        }
        service_updates {
          heading
          text
        }
        providers {
          heading
          text
        }
        patient_feedback {
          rating
          source_url
          source_name
          access_date
        }
        practices {
          heading
          text
        }
        contact {
          heading
          text
        }
      }
    }
    heroImage: file(relativePath: {eq: "hero-bg.png"}) {
      id
      childImageSharp {
        gatsbyImageData
      }
    }
    siteTitle: site(siteMetadata: {}) {
      siteMetadata {
        title
      }
    }
    conditions: allMdx(filter: {fields: {post_type: {eq: "conditions"}}}, limit: 5) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            thumbnail {
              childImageSharp {
                gatsbyImageData(width: 800)
              }
            }
            heading
          }
        }
      }
    }
    serviceUpdates: allMdx(
      filter: {fields: {post_type: {eq: "service-update"}}}
      limit: 3
    ) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            date(formatString: "Do MMMM YYYY")
            title
            description
          }
        }
      }
    }
    providers: allMdx(
      filter: {fields: {post_type: {eq: "providers"}}}
      sort: {frontmatter: {order: ASC}}
    ) {
      edges {
        node {
          id
          frontmatter {
            image {
              childImageSharp {
                gatsbyImageData(aspectRatio: 1, layout: FULL_WIDTH)
              }
            }
            name {
              fullname
              degree_abbr
              title
            }
          }
          fields {
            slug
          }
        }
      }
    }
    reviews: allMdx(filter: {fields: {post_type: {eq: "review"}}}) {
      edges {
        node {
          frontmatter {
            reviewerName: title
            stars
            source {
              name
              url
            }
          }
          body
        }
      }
    }
    practices: allMdx(filter: {fields: {post_type: {eq: "clinics"}}}) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            clinic_name
            lat
            lon
            address
            phone
            fax
          }
        }
      }
    }
  }
`
