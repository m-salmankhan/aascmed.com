import * as React from "react";
import moment from "moment";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { H1 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout } from "../components/layouts/main-side-column";
import { Article } from "../components/posts/article";
import { ShareButtons } from "../components/social-media/share";
import { PrimaryAnchor, PrimaryButton, stylesBtnSecondary, stylesButton } from "../components/buttons";
import { gridSpacing } from "../styles/theme";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";
import { SiteLink } from "../shared/navigation/link";
import type { ServiceUpdateRecord } from "../shared/content/models";

/** Normalized service-update data and browser pathname for sharing links. */
export interface ServiceUpdateViewProps { serviceUpdate: ServiceUpdateRecord; pathname: string }

/** Render a dated service-update detail page from shared content data.
 * @param props Service-update record and current browser pathname.
 * @returns The update layout with date, rich text, and browser-aware back navigation.
 */
export function ServiceUpdateView({ serviceUpdate, pathname }: ServiceUpdateViewProps) {
  const [jsEnabled, setJsEnabled] = React.useState(false);
  React.useEffect(() => setJsEnabled(true), []);
  const title = serviceUpdate.title || "Untitled";
  const rawDate = serviceUpdate.date;
  const formattedDate = rawDate ? moment(rawDate).format("Do MMMM YYYY") : "";
  const date = rawDate ? moment(rawDate) : null;
  const slug = date?.isValid()
    ? `/service-updates/${date.format("YYYY")}/${date.format("MM")}/${serviceUpdate.slug || ""}/`
    : `/service-updates/${serviceUpdate.slug || ""}/`;

  return <PrimarySecondaryColumnsLayout>
    <main css={css`margin-bottom: 5rem;`}>
      <Breadcrumbs path={[["/", "Home"], ["/service-updates/", "Service Updates"], [slug, title]]} css={css({ marginTop: "3em" })} />
      <Article css={css({ h3: { fontSize: "1rem" } })}>
        <H1>{title}</H1>
        <ShareButtons pageTitle={title} path={pathname} />
        <p>{formattedDate}</p>
        <Columns><MainCol>
          {serviceUpdate.body && <StrapiBlocksRenderer content={serviceUpdate.body as any[]} />}
          <footer>
            {jsEnabled
              ? <PrimaryButton onClick={() => { history.back(); return false; }} css={{ marginRight: gridSpacing / 2 + "em" }}>Go back</PrimaryButton>
              : <PrimaryAnchor css={{ marginRight: gridSpacing / 2 + "em" }} href="/">Return to home</PrimaryAnchor>}
            <SiteLink href="/contact" css={[stylesButton, stylesBtnSecondary]}>Get in touch</SiteLink>
          </footer>
        </MainCol></Columns>
      </Article>
    </main>
  </PrimarySecondaryColumnsLayout>;
}
