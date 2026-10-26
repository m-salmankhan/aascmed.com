import React from "react";
import { css } from "@emotion/react";
import { SiteLink } from "../shared/navigation/link";
import type { JsonValue, MediaDescriptor, ProviderRecord } from "../shared/content/models";
import { Layout } from "../components/layouts/default";
import { Container } from "../components/containers";
import { Breadcrumbs } from "../components/breadcrumbs";
import { Article } from "../components/posts/article";
import { Columns, MainCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { H1, SectionHeader } from "../components/headings";
import { Logo } from "../components/logo";
import { colours, gridSpacing } from "../styles/theme";
import { stylesBigH1 as bigHeadingStyles } from "../components/headings";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";
import { ContactSection } from "../components/contact/full-form";
import { PracticeArchive, type PracticeSummary } from "../components/practices/practice-archive";
import { BlogArchive, type BlogSummary } from "../components/blog-posts";
import { ConditionsArchive } from "../components/conditions";
import { ProviderArchive } from "../components/providers";
import { ServiceUpdateArchive } from "../components/service-updates";
import { Image } from "../components/media/image";

export interface FixedViewProps {
  heading?: string;
  blocks?: JsonValue[];
}

export function NotFoundView() {
  return <Layout><main><Container css={css({ minHeight: "50vh", textAlign: "center", marginTop: "5em" })}>
    <Logo css={{ fill: colours.brandPrimary }} />
    <h1 css={bigHeadingStyles}>Page Not Found!</h1>
    <p>The URL you have entered may be incorrect, or this page has been removed.</p>
    <p>If this appears to be a mistake, please <SiteLink href="/contact/">contact us</SiteLink></p>
  </Container></main></Layout>;
}

export function PrivacyView({ heading = "Privacy Policy", blocks, lastUpdated }: FixedViewProps & { lastUpdated?: string }) {
  return <PrimarySecondaryColumnsLayout><main>
    <Breadcrumbs path={[["/", "Home"], ["/privacy/", heading]]} css={css({ marginTop: "3em" })} />
    <Article><Columns><MainCol>
      <H1>{heading}</H1>
      {blocks && <StrapiBlocksRenderer content={blocks} />}
      {lastUpdated && <p>Last Updated: {lastUpdated}</p>}
      <p>We may change this privacy policy. If we change this policy, the above date will be amended to reflect the update.</p>
    </MainCol></Columns></Article>
  </main></PrimarySecondaryColumnsLayout>;
}

export function ContactView({ heading = "Contact Us", blocks, practices }: FixedViewProps & { practices: PracticeSummary[] }) {
  return <Layout><main><Container>
    <Breadcrumbs path={[["/", "Home"], ["/contact/", "Contact Us"]]} css={css({ marginTop: "3em" })} />
    <ContactSection title={heading} textContent={blocks ? <StrapiBlocksRenderer content={blocks} /> : undefined}
      css={css`margin: 0 -${gridSpacing / 2}rem`} />
    <PracticeArchive practices={practices} heading="Practice Locations" isHomePage={true}
      css={css({ margin: `0 -${gridSpacing / 2}em` })} />
  </Container></main></Layout>;
}

export interface BlogViewItem extends Omit<BlogSummary, "thumbnail"> { thumbnail?: MediaDescriptor }
export function BlogArchiveView({ heading = "Blog", blocks, blogs }: FixedViewProps & { blogs: BlogViewItem[] }) {
  return <Layout><Container>
    <Breadcrumbs path={[["/", "Home"], ["/blog/", "Blog"]]} css={css({ marginTop: "3em" })} />
    <BlogArchive heading={heading} textContent={blocks ? <StrapiBlocksRenderer content={blocks} /> : undefined}
      blogPosts={blogs.map(({ thumbnail, ...blog }) => ({ ...blog, thumbnail: thumbnail ? <Image image={thumbnail} fit="cover" /> : undefined }))}
      frontPage={false} css={css({ margin: `0 -${gridSpacing / 2}em` })} />
  </Container></Layout>;
}

export interface ConditionViewItem { slug: string; title: string; thumbnail?: MediaDescriptor }
export function ConditionsArchiveView({ heading = "Conditions", blocks, conditions }: FixedViewProps & { conditions: ConditionViewItem[] }) {
  return <Layout><main><Container>
    <Breadcrumbs path={[["/", "Home"], ["/conditions/", "Conditions"]]} css={css({ marginTop: "3em" })} />
    <ConditionsArchive heading={heading} textContent={blocks ? <StrapiBlocksRenderer content={blocks} /> : undefined}
      frontPage={false} showViewAll={false} conditionsList={conditions.map(({ thumbnail, ...item }) => ({ ...item, thumbnail: thumbnail ? <Image alt="" image={thumbnail} /> : undefined }))}
      css={{ margin: `2em -${gridSpacing / 2}rem` }} />
  </Container></main></Layout>;
}

export interface ProviderViewItem {
  slug: string;
  name?: ProviderRecord["name"];
  retired: boolean;
  image?: MediaDescriptor;
  excerpt: string;
}
export function ProvidersArchiveView({ heading = "Meet the team", blocks, providers }: FixedViewProps & { providers: ProviderViewItem[] }) {
  const stylesExpandGridPadding = css`margin: 0 ${-gridSpacing / 2}em;`;
  return <Layout><Container>
    <Breadcrumbs path={[["/", "Home"], ["/providers/", "Providers"]]} css={css({ marginTop: "3em" })} />
    <div css={stylesExpandGridPadding}>
      <SectionHeader heading={<h1 css={bigHeadingStyles}>{heading}</h1>} bodyContent={blocks ? <StrapiBlocksRenderer content={blocks} /> : undefined} />
      <ProviderArchive providers={providers.map((provider) => ({
        slug: provider.slug || "", excerpt: provider.excerpt,
        name: { fullName: provider.name?.fullName || "", title: provider.name?.honorific && provider.name.honorific !== "None" ? provider.name.honorific : "", degreeAbbr: provider.name?.qualificationAbbr || "" },
        retired: provider.retired,
        image: provider.image ? <Image image={provider.image} alt={`An image of ${provider.name?.honorific && provider.name.honorific !== "None" ? `${provider.name.honorific} ` : ""}${provider.name?.fullName || ""}`} /> : undefined,
      }))} />
    </div>
  </Container></Layout>;
}

export function ClinicsArchiveView({ heading = "Clinics", blocks, practices }: FixedViewProps & { practices: PracticeSummary[] }) {
  return <Layout><main><Container>
    <Breadcrumbs path={[["/", "Home"], ["/clinics/", "Clinics"]]} css={css({ marginTop: "3em" })} />
    <PracticeArchive practices={practices} heading={heading} textContent={blocks ? <StrapiBlocksRenderer content={blocks} /> : undefined}
      isHomePage={false} lazyLoad={false} css={css({ margin: `0 -${gridSpacing / 2}em` })} />
  </Container></main></Layout>;
}

export function ServiceUpdatesArchiveView({ heading = "Service Updates", blocks, serviceUpdates }: FixedViewProps & { serviceUpdates: Array<{ slug: string; date: string; title: string; description: string }> }) {
  return <Layout><Container>
    <Breadcrumbs path={[["/", "Home"], ["/service-updates/", "Service Updates"]]} css={css({ marginTop: "3em" })} />
    <ServiceUpdateArchive heading={heading} textContent={blocks ? <StrapiBlocksRenderer content={blocks} /> : undefined}
      serviceUpdates={serviceUpdates} frontPage={false} css={css({ margin: `0 -${gridSpacing / 2}em` })} />
  </Container></Layout>;
}
