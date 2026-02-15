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
import { SEO, usePageTitle } from "../components/seo";
import { Footer } from "../components/footer";
import { BlogArchive } from "../components/blog-posts";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";

// Helper to parse text blocks from a section in internal.content
const parseTextBlocks = (parsedData: any, sectionName: string): any[] | null => {
  if (!parsedData || !parsedData[sectionName]?.text) return null;
  return parsedData[sectionName].text;
};

const IndexPage: React.FC<PageProps<Queries.IndexPageQuery>> = ({ data }) => {
  const heroImage = data.heroImage?.childImageSharp?.gatsbyImageData;
  const siteTitle = data.siteTitle?.siteMetadata?.title || "Allergy Asthma and Sinus Centres";
  const homePage = data.strapiHomePage;
  const pageTitle = usePageTitle("Allergy, Asthma and Sinus Centers in Illinois", false);

  // Parse the full internal.content JSON once
  const rawContent = homePage?.internal?.content;
  const parsedData = rawContent ? JSON.parse(rawContent) : null;

  // Hero section
  const heroTitle = homePage?.hero?.heading || siteTitle;
  const heroTextBlocks = parseTextBlocks(parsedData, 'hero');

  // Conditions section
  const conditionsTitle = homePage?.conditions?.heading || "Learn more about the conditions we treat.";
  const conditionsTextBlocks = parseTextBlocks(parsedData, 'conditions');
  const conditions: ConditionSummary[] = data.conditions.nodes.map(node => ({
    slug: `/conditions/${node.slug}/`,
    title: node.heading || node.title || "",
    thumbnail: node.thumbnail?.localFile?.childImageSharp?.gatsbyImageData,
  }));

  // Service updates section
  const serviceUpdatesTitle = homePage?.serviceUpdates?.heading || "Service Updates";
  const serviceUpdatesTextBlocks = parseTextBlocks(parsedData, 'serviceUpdates');
  const serviceUpdates: ServiceUpdateSummary[] = data.serviceUpdates.nodes.map(node => {
    const date = node.date ? new Date(node.date) : null;
    const year = date ? date.getFullYear() : '';
    const month = date ? String(date.getMonth() + 1).padStart(2, '0') : '';
    const slug = date 
      ? `/service-updates/${year}/${month}/${node.slug}/`
      : `/service-updates/${node.slug}/`;
    
    return {
      slug,
      title: node.title || "",
      date: node.formattedDate || "",
      description: node.description || "",
    };
  });

  // Blog section
  const blogsTitle = homePage?.blog?.heading || "Blog";
  const blogsTextBlocks = parseTextBlocks(parsedData, 'blog');
  const blogs: ServiceUpdateSummary[] = data.blogs.nodes.map(node => ({
    slug: `/blog/${node.slug}/`,
    title: node.title || "",
    date: node.date || "",
    description: node.description || "",
  }));

  // Providers section
  const providersTitle = homePage?.providers?.heading || "Meet the team";
  const providersTextBlocks = parseTextBlocks(parsedData, 'providers');
  const providers: ProviderSummary[] = data.providers.nodes
    .filter(node => !node.retirementNotice?.retired) // Exclude retired providers
    .map(node => ({
      slug: `/providers/${node.slug}/`,
      name: {
        fullName: node.name?.fullName || "",
        title: node.name?.honorific && node.name.honorific !== "None" ? node.name.honorific : "",
        degreeAbbr: node.name?.qualificationAbbr || "",
      },
      retired: false,
      image: node.image?.localFile?.childImageSharp?.gatsbyImageData,
    }));

  // Feedback section
  const avgRating = {
    rating: homePage?.feedback?.rating || 0,
    source: {
      name: homePage?.feedback?.sourceName || "",
      url: homePage?.feedback?.sourceUrl || "",
    },
    date: homePage?.feedback?.accessDate || "",
  };

  const reviews: Review[] = data.reviews.nodes.map(node => {
    // Parse the content blocks from internal.content
    const rawContent = node.internal?.content;
    const parsedContent = rawContent ? JSON.parse(rawContent) : null;
    const contentBlocks = parsedContent?.content as any[] | null;
    
    return {
      stars: node.stars || 0,
      body: contentBlocks,
      source: {
        url: node.sourceUrl || "",
        name: node.sourceName || "",
      },
      reviewerName: node.name || "",
    };
  });

  // Locations/Practices section
  const practicesTitle = homePage?.locations?.heading || "Practices";
  const practicesTextBlocks = parseTextBlocks(parsedData, 'locations');
  const practices: PracticeSummary[] = data.practices.nodes.map(clinic => ({
    slug: '/clinics/' + (clinic.slug || `${(clinic.clinic_name || "").toLowerCase().replace(/\s+/g, '-')}/`),
    clinic_name: clinic.clinic_name || "Untitled Clinic",
    longitude: clinic.location?.long || 0,
    latitude: clinic.location?.lat || 0,
    address: clinic.location?.address || "",
    phone: clinic.contact?.phone || "",
    fax: clinic.contact?.fax || "",
  }));

  // Contact section
  const contactTitle = homePage?.contact?.heading || "Contact Us";
  const contactTextBlocks = parseTextBlocks(parsedData, 'contact');

  return (
    <App pageTitle={pageTitle}>
      <Hero 
        image={heroImage} 
        heading={heroTitle} 
        textContent={heroTextBlocks ? <StrapiBlocksRenderer content={heroTextBlocks} /> : undefined}
      />
      <main id={"main"}>
        <Container>
          <ConditionsArchive 
            showViewAll={true} 
            heading={conditionsTitle} 
            textContent={conditionsTextBlocks ? <StrapiBlocksRenderer content={conditionsTextBlocks} /> : undefined}
            frontPage={true} 
            conditionsList={conditions} 
            css={css({ marginTop: "5em", })} 
          />
          <BlogArchive 
            blogPosts={blogs} 
            frontPage={true} 
            heading={blogsTitle} 
            textContent={blogsTextBlocks ? <StrapiBlocksRenderer content={blogsTextBlocks} /> : undefined}
            css={css({ marginTop: "4em", })} 
          />
          <ProvidersArchiveHomePageLayout 
            providers={providers} 
            heading={providersTitle} 
            textContent={providersTextBlocks ? <StrapiBlocksRenderer content={providersTextBlocks} /> : undefined}
            css={css({ marginTop: "4em", })} 
          />
          <ServiceUpdateArchive 
            serviceUpdates={serviceUpdates} 
            frontPage={true} 
            heading={serviceUpdatesTitle} 
            textContent={serviceUpdatesTextBlocks ? <StrapiBlocksRenderer content={serviceUpdatesTextBlocks} /> : undefined}
            css={css({ marginTop: "4em", })} 
          />
        </Container>
        <PatientFeedback css={css({ marginTop: "5em", })} averageRating={avgRating} reviews={reviews} />
        <Container>
          <ContactSection 
            css={css({ marginTop: "5em", })} 
            title={contactTitle} 
            textContent={contactTextBlocks ? <StrapiBlocksRenderer content={contactTextBlocks} /> : undefined}
          />
          <PracticeArchive 
            css={css({ marginTop: "5em", })} 
            practices={practices} 
            heading={practicesTitle} 
            textContent={practicesTextBlocks ? <StrapiBlocksRenderer content={practicesTextBlocks} /> : undefined}
            isHomePage={true} 
          />
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
  const description = props.data.strapiHomePage?.metaDescription || "";

  return (
    <SEO description={description} slug={props.location.pathname} title={"Allergy, Asthma and Sinus Centers in Illinois"} appendBusinessNameToTitle={false} useTracking={true}>
      <meta name={"og:type"} content={"website"} />
    </SEO>
  )
}

export default IndexPage

export const query = graphql`
  query IndexPage {
    strapiHomePage {
      metaDescription
      internal {
        content
      }
      hero {
        heading
      }
      conditions {
        heading
      }
      serviceUpdates {
        heading
      }
      blog {
        heading
      }
      providers {
        heading
      }
      feedback {
        rating
        sourceName
        sourceUrl
        accessDate
      }
      locations {
        heading
      }
      contact {
        heading
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
    conditions: allStrapiCondition(sort: {order: ASC}, limit: 8) {
      nodes {
        slug
        title
        heading
        thumbnail {
          localFile {
            childImageSharp {
              gatsbyImageData(width: 800)
            }
          }
        }
      }
    }
    serviceUpdates: allStrapiServiceUpdate(sort: {date: DESC}, limit: 3) {
      nodes {
        slug
        title
        description
        date
        formattedDate: date(formatString: "Do MMMM YYYY")
      }
    }

    blogs: allStrapiBlog(sort: {date: DESC}, limit: 6) {
      nodes {
        slug
        title
        description
        date(formatString: "Do MMMM YYYY")
      }
    }
      
    providers: allStrapiProvider(sort: {order: ASC}) {
      nodes {
        id
        slug
        name {
          fullName
          honorific
          qualificationAbbr
        }
        retirementNotice {
          retired
        }
        image {
          localFile {
            childImageSharp {
              gatsbyImageData(aspectRatio: 1, layout: FULL_WIDTH)
            }
          }
        }
      }
    }
    reviews: allStrapiReview {
      nodes {
        name
        stars
        sourceName
        sourceUrl
        internal {
          content
        }
      }
    }
    practices: allStrapiClinic {
      nodes {
        clinic_name
        slug
        location {
          address
          lat
          long
        }
        contact {
          phone
          fax
        }
      }
    }
  }
`
