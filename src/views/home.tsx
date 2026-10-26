import React from "react";
import { css } from "@emotion/react";
import { HeroBase } from "../components/header/hero-base";
import { Navigation } from "../components/header/navigation";
import { Image, HeroImage } from "../components/media/image";
import type { JsonValue, MediaDescriptor } from "../shared/content/models";
import { ConditionsArchive } from "../components/conditions/";
import type { ConditionSummary } from "../components/conditions/conditions-archive";
import { ServiceUpdateArchive } from "../components/service-updates";
import type { ServiceUpdateSummary } from "../components/service-updates/service-update-archive";
import { ProvidersArchiveHomePageLayout, type ProviderSummary } from "../components/providers";
import { PatientFeedback } from "../components/patient-feedback";
import type { Review as PatientReview } from "../components/patient-feedback/reviews";
import { Container } from "../components/containers";
import { PracticeArchive, type PracticeSummary } from "../components/practices/practice-archive";
import { ContactSection } from "../components/contact/full-form";
import { Footer } from "../components/footer";
import { BlogArchive, type BlogSummary } from "../components/blog-posts";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";
import { SectionMedia, type SectionMediaItem } from "../components/strapi/section-media";
import { SectionHeader, stylesBigH1 } from "../components/headings";
import { PatientFormsBanner } from "../components/patient-forms/cta-banner";
import { HorizontalCalloutBanner } from "../components/cta/horizontal-banner";

/** Plain, JSON-safe homepage data. React nodes and Gatsby data stay out of the view boundary. */
export interface HomeSection {
  heading: string;
  /** Strapi Blocks content in its serializable JSON form. */
  text?: JsonValue[];
  media?: HomeMediaItem[];
}

/** Serializable source metadata used by homepage sections with mixed media. */
export interface HomeMediaItem {
  /** CMS MIME value used to distinguish image and video media. */
  mime?: string | null;
  name?: string | null;
  url?: string | null;
  descriptor?: MediaDescriptor;
}

/** Condition card summary with a plain media descriptor in place of a React node. */
export interface HomeCondition extends Omit<ConditionSummary, "thumbnail"> {
  thumbnail?: MediaDescriptor;
}

/** Provider card summary with a plain media descriptor in place of a React node. */
export interface HomeProvider extends Omit<ProviderSummary, "image"> {
  image?: MediaDescriptor;
}

/** Blog card summary with a plain media descriptor in place of a React node. */
export interface HomeBlog extends Omit<BlogSummary, "thumbnail"> {
  thumbnail?: MediaDescriptor;
}

/** Review summary in the data shape expected by the homepage feedback section. */
export interface HomeReview {
  reviewerName: string;
  body: JsonValue[] | null;
  /** Numeric star rating supplied by the reviews CMS. */
  stars: number;
  source: { url: string; name: string };
}

/** Complete normalized, framework-neutral data required to render the homepage. */
export interface HomeViewProps {
  siteTitle: string;
  hero: HomeSection & { image?: MediaDescriptor };
  genericSections: HomeSection[];
  conditions: HomeSection & { items: HomeCondition[] };
  blogs: HomeSection & { items: HomeBlog[] };
  providers: HomeSection & { items: HomeProvider[] };
  serviceUpdates: HomeSection & { items: ServiceUpdateSummary[] };
  feedback: {
    averageRating: {
      rating: number;
      source: { name: string; url: string };
      date: string;
    };
    reviews: HomeReview[];
  };
  contact: HomeSection;
  /** Non-empty clinic names available as choices in the contact form. */
  clinicOptions: string[];
  locations: HomeSection & { practices: PracticeSummary[] };
}

/** Convert optional rich-text data into its shared renderer.
 * @param blocks Optional JSON blocks from CMS content.
 * @returns A rich-text element, or undefined when no blocks were supplied.
 */
function renderText(blocks?: JsonValue[]) {
  return blocks ? <StrapiBlocksRenderer content={blocks as any[]} /> : undefined;
}

/** Render supported image/video section media.
 * @param media Optional normalized media items from CMS sections.
 * @returns A section-media element, or undefined when no displayable items exist.
 */
function renderMedia(media?: HomeMediaItem[]) {
  const valid = (media || []).filter((item) => item.mime?.startsWith("image/") || item.mime?.startsWith("video/"));
  if (valid.length === 0) return undefined;
  return <SectionMedia media={valid as SectionMediaItem[]} />;
}

/** Render the homepage from normalized serializable props.\n * @param props Homepage copy, media, archive items, reviews, and non-empty clinic choices.\n * @returns The shared homepage composition without framework query data.\n */
export function HomeView({
  siteTitle,
  hero,
  genericSections,
  conditions,
  blogs,
  providers,
  serviceUpdates,
  feedback,
  contact,
  clinicOptions,
  locations,
}: HomeViewProps) {
  return <>
    <HeroBase
      image={hero.image ? <HeroImage image={hero.image} alt="" draggable={false} /> : undefined}
      heading={hero.heading || siteTitle}
      textContent={renderText(hero.text)}
      media={renderMedia(hero.media)}
      navigation={<Navigation css={css({ position: "relative", zIndex: 1 })} frontPage={true} />}
    />
    <PatientFormsBanner
      registrationFormUrl="https://form-aasc-allergy.raga.ai/forms/patient-registration-form"
      healthHistoryFormUrl="https://form-aasc-allergy.raga.ai/forms/patient-health-history-form"
    />
    <main id="main">
      {genericSections.length > 0 && <Container>
        {genericSections.map((section, idx) => <section key={idx} css={css({ marginTop: "4em" })}>
          <SectionHeader
            heading={<h2 css={stylesBigH1}>{section.heading}</h2>}
            bodyContent={renderText(section.text)}
            media={renderMedia(section.media)}
          />
        </section>)}
      </Container>}
      <Container>
        <ConditionsArchive
          showViewAll={true}
          heading={conditions.heading}
          textContent={renderText(conditions.text)}
          media={renderMedia(conditions.media)}
          frontPage={true}
          conditionsList={conditions.items.map(({ thumbnail, ...item }) => ({
            ...item,
            thumbnail: thumbnail ? <Image image={thumbnail} alt="" /> : undefined,
          }))}
          css={css({ marginTop: "5em" })}
        />
        <BlogArchive
          blogPosts={blogs.items.map(({ thumbnail, ...blog }) => ({
            ...blog,
            thumbnail: thumbnail ? <Image image={thumbnail} /> : undefined,
          }))}
          frontPage={true}
          heading={blogs.heading}
          textContent={renderText(blogs.text)}
          media={renderMedia(blogs.media)}
          css={css({ marginTop: "4em" })}
        />
        <ProvidersArchiveHomePageLayout
          providers={providers.items.map((provider) => ({
            ...provider,
            image: provider.image ? <Image image={provider.image} alt={`An image of ${provider.name.title || ""} ${provider.name.fullName}`} /> : undefined,
          }))}
          heading={providers.heading}
          textContent={renderText(providers.text)}
          media={renderMedia(providers.media)}
          css={css({ marginTop: "4em" })}
        />
        <ServiceUpdateArchive
          serviceUpdates={serviceUpdates.items}
          frontPage={true}
          heading={serviceUpdates.heading}
          textContent={renderText(serviceUpdates.text)}
          media={renderMedia(serviceUpdates.media)}
          css={css({ marginTop: "4em" })}
        />
      </Container>
      <PatientFeedback css={css({ marginTop: "5em" })} averageRating={feedback.averageRating} reviews={feedback.reviews as PatientReview[]} />
      <Container>
        <ContactSection
          css={css({ marginTop: "5em" })}
          title={contact.heading}
          textContent={renderText(contact.text)}
          clinicOptions={clinicOptions}
        />
        <PracticeArchive
          css={css({ marginTop: "5em" })}
          practices={locations.practices}
          heading={locations.heading}
          textContent={renderText(locations.text)}
          media={renderMedia(locations.media)}
          isHomePage={true}
        />
      </Container>
    </main>
    <HorizontalCalloutBanner
      title="New patient? Save time at your first visit."
      description="Complete both forms online before you arrive."
      primaryButtonLabel="Registration Form"
      primaryButtonUrl="https://form-aasc-allergy.raga.ai/forms/patient-registration-form"
      secondaryButtonLabel="Health History Form"
      secondaryButtonUrl="https://form-aasc-allergy.raga.ai/forms/patient-health-history-form"
    />
    <Footer />
  </>;
}
