import React from "react";
import { graphql, HeadProps, PageProps, Script } from "gatsby";
import { isJsonValue, mapGatsbyMedia } from "../shared/content/gatsby-adapter";
import type { JsonValue } from "../shared/content/models";
import { GatsbySEO as SEO } from "../adapters/gatsby/seo";
import { App } from "../components/layouts/app";
import { HomeView, type HomeMediaItem, type HomeSection, type HomeViewProps } from "../views/home";

function readContent(value?: string | null): Record<string, any> | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, any> : null;
  } catch {
    return null;
  }
}

function jsonBlocks(value: unknown): JsonValue[] | undefined {
  return Array.isArray(value) && value.every(isJsonValue) ? value : undefined;
}

function mapSectionMedia(section: any): HomeMediaItem[] | undefined {
  if (!Array.isArray(section?.media) || section.media.length === 0) return undefined;
  return section.media.map((item: any) => ({
    mime: item.mime,
    name: item.name,
    url: item.localFile?.publicURL || item.url,
    descriptor: mapGatsbyMedia({ ...item, publicURL: item.localFile?.publicURL, localFile: item.localFile }),
  }));
}

function mapSection(section: any, content: Record<string, any> | null, key: string, fallback: string): HomeSection {
  return {
    heading: section?.heading || fallback,
    text: jsonBlocks(content?.[key]?.text),
    media: mapSectionMedia(section),
  };
}

const IndexPage: React.FC<PageProps<Queries.IndexPageQuery>> = ({ data }) => {
  const homePage = data.strapiHomePage;
  const content = readContent(homePage?.internal?.content);
  const siteTitle = data.siteTitle?.siteMetadata?.title || "Allergy Asthma and Sinus Centres";

  const genericSections: HomeSection[] = ((homePage as any)?.genericBelowHero || []).map((section: any, idx: number) => ({
    heading: section?.heading || "",
    text: jsonBlocks(content?.genericBelowHero?.[idx]?.text),
    media: mapSectionMedia(section),
  })).filter((section: HomeSection) => section.heading || section.text?.length || section.media?.length);

  const conditions = data.conditions.nodes.map((node) => ({
    slug: `/conditions/${node.slug}/`,
    title: node.heading || node.title || "",
    thumbnail: node.thumbnail?.localFile?.childImageSharp?.gatsbyImageData
      ? mapGatsbyMedia({ localFile: node.thumbnail.localFile })
      : undefined,
  }));

  const serviceUpdates = data.serviceUpdates.nodes.map((node) => {
    const date = node.date ? new Date(node.date) : null;
    const year = date ? date.getFullYear() : "";
    const month = date ? String(date.getMonth() + 1).padStart(2, "0") : "";
    return {
      slug: date ? `/service-updates/${year}/${month}/${node.slug}/` : `/service-updates/${node.slug}/`,
      title: node.title || "",
      date: node.formattedDate || "",
      description: node.description || "",
    };
  });

  const blogs = data.blogs.nodes.map((node) => ({
    slug: `/blog/${node.slug}/`,
    title: node.title || "",
    date: node.date || "",
    description: node.description || "",
  }));

  const providers = data.providers.nodes
    .filter((node) => !node.retirementNotice?.retired)
    .map((node) => ({
      slug: `/providers/${node.slug}/`,
      name: {
        fullName: node.name?.fullName || "",
        title: node.name?.honorific && node.name.honorific !== "None" ? node.name.honorific : "",
        degreeAbbr: node.name?.qualificationAbbr || "",
      },
      retired: false,
      image: node.image?.localFile?.childImageSharp?.gatsbyImageData
        ? mapGatsbyMedia({ localFile: node.image.localFile })
        : undefined,
    }));

  const reviews = data.reviews.nodes.map((node) => ({
    stars: node.stars || 0,
    body: jsonBlocks(readContent(node.internal?.content)?.content) || null,
    source: { url: node.sourceUrl || "", name: node.sourceName || "" },
    reviewerName: node.name || "",
  }));

  const practices = data.practices.nodes.map((clinic) => ({
    slug: "/clinics/" + (clinic.slug || `${(clinic.clinic_name || "").toLowerCase().replace(/\s+/g, "-")}/`),
    clinic_name: clinic.clinic_name || "Untitled Clinic",
    longitude: clinic.location?.long || 0,
    latitude: clinic.location?.lat || 0,
    address: clinic.location?.address || "",
    phone: clinic.contact?.phone || "",
    fax: clinic.contact?.fax || "",
  }));

  const viewProps: HomeViewProps = {
    siteTitle,
    hero: {
      heading: homePage?.hero?.heading || siteTitle,
      text: jsonBlocks(content?.hero?.text),
      media: mapSectionMedia(homePage?.hero),
      image: mapGatsbyMedia({ localFile: { publicURL: data.heroImage?.publicURL, childImageSharp: { gatsbyImageData: data.heroImage?.childImageSharp?.gatsbyImageData } } }),
    },
    genericSections,
    conditions: { ...mapSection(homePage?.conditions, content, "conditions", "Learn more about the conditions we treat."), items: conditions },
    blogs: { ...mapSection(homePage?.blog, content, "blog", "Blog"), items: blogs },
    providers: { ...mapSection(homePage?.providers, content, "providers", "Meet the team"), items: providers },
    serviceUpdates: { ...mapSection(homePage?.serviceUpdates, content, "serviceUpdates", "Service Updates"), items: serviceUpdates },
    feedback: {
      averageRating: {
        rating: homePage?.feedback?.rating || 0,
        source: { name: homePage?.feedback?.sourceName || "", url: homePage?.feedback?.sourceUrl || "" },
        date: homePage?.feedback?.accessDate || "",
      },
      reviews,
    },
    contact: mapSection(homePage?.contact, content, "contact", "Contact Us"),
    locations: { ...mapSection(homePage?.locations, content, "locations", "Practices"), practices },
  };

  return <App><HomeView {...viewProps} />
    <Script src="https://identity.netlify.com/v1/netlify-identity-widget.js" />
    <script dangerouslySetInnerHTML={{ __html: `
      if (window.netlifyIdentity) {
        window.netlifyIdentity.on('init', user => {
          if (!user) {
            window.netlifyIdentity.on('login', () => { document.location.href = '/admin/'; });
          }
        });
      }
    ` }} />
  </App>;
};

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
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
      conditions {
        heading
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
      serviceUpdates {
        heading
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
      blog {
        heading
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
      providers {
        heading
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
      feedback {
        rating
        sourceName
        sourceUrl
        accessDate
      }
      locations {
        heading
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
      contact {
        heading
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
      genericBelowHero {
        heading
        media {
          mime
          name
          url
          localFile {
            childImageSharp {
              gatsbyImageData(width: 600)
            }
            publicURL
          }
        }
      }
    }
    heroImage: file(relativePath: {eq: "hero-bg.png"}) {
      id
      childImageSharp {
        gatsbyImageData
      }
      publicURL
    }
    siteTitle: site(siteMetadata: {}) {
      siteMetadata {
        title
      }
    }
    conditions: allStrapiCondition(sort: {order: ASC}, limit: 11) {
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
