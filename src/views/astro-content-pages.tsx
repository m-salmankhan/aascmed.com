import React from "react";
import type { BlogRecord, ConditionRecord, ProviderRecord } from "../shared/content/models";
import type { SiteData } from "../shared/data/site-data";
import {
  BlogArchiveView,
  ConditionsArchiveView,
  ProvidersArchiveView,
  NotFoundView,
  type BlogViewItem,
  type ConditionViewItem,
  type ProviderViewItem,
} from "./fixed-archive";
import { BlogPostView } from "./blog-post";
import { ConditionView } from "./condition";
import { ProviderView } from "./provider";
import { AstroSiteDataProvider } from "./astro-site-data";

type WithSiteData = { pathname: string; siteData: SiteData };

export function AstroBlogArchivePage(props: WithSiteData & {
  heading: string;
  blocks?: BlogRecord["content"];
  blogs: BlogViewItem[];
}) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <BlogArchiveView heading={props.heading} blocks={props.blocks} blogs={props.blogs} />
  </AstroSiteDataProvider>;
}

export function AstroConditionsArchivePage(props: WithSiteData & {
  heading: string;
  blocks?: ConditionRecord["content"];
  conditions: ConditionViewItem[];
}) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ConditionsArchiveView heading={props.heading} blocks={props.blocks} conditions={props.conditions} />
  </AstroSiteDataProvider>;
}

export function AstroProvidersArchivePage(props: WithSiteData & {
  heading: string;
  blocks?: ProviderRecord["body"];
  providers: ProviderViewItem[];
}) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ProvidersArchiveView heading={props.heading} blocks={props.blocks} providers={props.providers} />
  </AstroSiteDataProvider>;
}

export function AstroBlogPostPage(props: WithSiteData & { blog: BlogRecord }) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <BlogPostView blog={props.blog} pathname={props.pathname} />
  </AstroSiteDataProvider>;
}

export function AstroConditionPage(props: WithSiteData & { condition: ConditionRecord }) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ConditionView condition={props.condition} pathname={props.pathname} />
  </AstroSiteDataProvider>;
}

export function AstroProviderPage(props: WithSiteData & { provider: ProviderRecord }) {
  return <AstroSiteDataProvider pathname={props.pathname} siteData={props.siteData}>
    <ProviderView provider={props.provider} pathname={props.pathname} />
  </AstroSiteDataProvider>;
}

export function AstroContentNotFound() {
  return <NotFoundView />;
}
