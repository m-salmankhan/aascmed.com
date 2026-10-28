import React from "react";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { H1, H4 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol } from "../components/layouts/main-side-column";
import { Article } from "../components/posts/article";
import { InfoNotice } from "../components/posts/shortcode-components";
import { ShareButtons } from "../components/social-media/share";
import { Image } from "../components/media/image";
import { StrapiBlocksRenderer, StrapiDynamicZoneRenderer } from "../components/strapi/blocks-renderer";
import { SiteLink } from "../shared/navigation/link";
import type { ProviderRecord } from "../shared/content/models";

/** Normalized provider data and browser pathname for sharing links. */
export interface ProviderViewProps { provider: ProviderRecord; pathname: string }

/** Provider retirement state and optional notice content shown to readers. */
type RetirementNoticeProps = { retired: boolean; noticeBlocks?: any[] };

const stylesImage = css({ display: "block", width: "70%", height: "auto", borderRadius: "50%", overflow: "hidden" });

/** Render provider profile details from a shared provider record.
 * @param props Provider record and current browser pathname.
 * @returns The provider layout with biography, retirement notice, image, and review.
 */
export function ProviderView({ provider, pathname }: ProviderViewProps) {
  const name = provider.name?.fullName || "Untitled";
  const honorific = provider.name?.honorific && provider.name.honorific !== "None" ? provider.name.honorific : "";
  const degreeAbbr = provider.name?.qualificationAbbr || "";
  const pageTitle = `${honorific} ${name}`.trim();
  const pageHeading = degreeAbbr ? `${name}, ${degreeAbbr}` : name;
  const slug = `/providers/${provider.slug || ""}/`;
  const review = provider.review;

  return <PrimarySecondaryColumnsLayout>
    <main>
      <Breadcrumbs path={[["/", "Home"], ["/providers/", "Providers"], [slug, name]]} css={css({ marginTop: "3em", marginBottom: "1em" })} />
      <Article css={css({ h3: { fontSize: "1rem" } })}>
        <Columns>
          <MainCol>
            <H1>{pageHeading}</H1>
            <ShareButtons pageTitle={pageTitle} path={pathname} />
            <RetirementNotice retired={provider.retirementNotice?.retired === true} noticeBlocks={provider.retirementNotice?.text} />
            {provider.body && <StrapiDynamicZoneRenderer content={provider.body as any[]} />}
            <footer><ShareButtons pageTitle={pageTitle} path={pathname} /></footer>
          </MainCol>
          <SideCol>
            <aside>
              {provider.image && <Image css={stylesImage} alt={`A photo of ${honorific} ${name}`.trim()} image={provider.image} />}
              {review && <>
                <H4>Featured Review</H4>
                {review.text && <p>{review.text}</p>}
                {(review.reviewer || review.date) && <p>{review.reviewer}{review.reviewer && " - "}{review.link
                  ? <SiteLink href={review.link}>{review.date}</SiteLink>
                  : review.date}</p>}
              </>}
            </aside>
          </SideCol>
        </Columns>
      </Article>
    </main>
  </PrimarySecondaryColumnsLayout>;
}

/** Show the provider's retirement notice only when retired content exists.
 * @param props Retirement state and optional rich-text notice blocks.
 * @returns The notice component, or null when it should not be shown.
 */
function RetirementNotice({ retired, noticeBlocks }: RetirementNoticeProps) {
  if (!retired || !noticeBlocks?.length) return null;
  return <InfoNotice css={css`margin-bottom: 1em;`}><StrapiBlocksRenderer content={noticeBlocks} /></InfoNotice>;
}
