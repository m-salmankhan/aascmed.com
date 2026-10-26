import React from "react";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { H1 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol } from "../components/layouts/main-side-column";
import { Article } from "../components/posts/article";
import { Contents } from "../components/posts/contents";
import { ShareButtons } from "../components/social-media/share";
import { StrapiDynamicZoneRenderer } from "../components/strapi/blocks-renderer";
import type { ConditionRecord } from "../shared/content/models";
import { extractTableOfContents } from "../utils/strapi-toc";

export interface ConditionViewProps { condition: ConditionRecord; pathname: string }

export function ConditionView({ condition, pathname }: ConditionViewProps) {
  const title = condition.title || "Untitled";
  const heading = condition.heading || title;
  const slug = `/conditions/${condition.slug || ""}/`;
  const content = condition.content;
  const tocItems = content ? extractTableOfContents(content as any[]) : [];

  return <PrimarySecondaryColumnsLayout>
    <main>
      <Breadcrumbs path={[["/", "Home"], ["/conditions/", "Conditions"], [slug, heading]]} css={css({ marginTop: "3em" })} />
      <Article>
        <H1>{heading}</H1>
        <ShareButtons pageTitle={title} path={pathname} />
        <Columns>
          <MainCol>
            {content && <StrapiDynamicZoneRenderer content={content as any[]} />}
            <footer><ShareButtons pageTitle={title} path={pathname} /></footer>
          </MainCol>
          <SideCol><Contents items={tocItems} /></SideCol>
        </Columns>
      </Article>
    </main>
  </PrimarySecondaryColumnsLayout>;
}
