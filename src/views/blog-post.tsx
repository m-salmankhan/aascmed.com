import React from "react";
import { css } from "@emotion/react";
import { Breadcrumbs } from "../components/breadcrumbs";
import { H1 } from "../components/headings";
import { Columns, MainCol, PrimarySecondaryColumnsLayout, SideCol } from "../components/layouts/main-side-column";
import { Article } from "../components/posts/article";
import { ContactBanner } from "../components/posts/shortcode-components";
import { Contents } from "../components/posts/contents";
import { ShareButtons } from "../components/social-media/share";
import { StrapiBlocksRenderer } from "../components/strapi/blocks-renderer";
import { HeroImage } from "../components/media/image";
import type { BlogRecord } from "../shared/content/models";
import { extractTableOfContents } from "../utils/strapi-toc";

/** Normalized blog record and browser pathname required by the detail page. */
export interface BlogPostViewProps {
  blog: BlogRecord;
  pathname: string;
}

/** Parsed blog dynamic-zone entries supported by the detail-page renderer. */
type BlogContentProps = { content: any[] };

/** Render a blog detail page from shared blog data.
 * @param props Normalized blog record and current browser pathname for sharing links.
 * @returns The blog detail layout, including content, table of contents, and media.
 */
export function BlogPostView({ blog, pathname }: BlogPostViewProps) {
  const title = blog.title || "Untitled";
  const heading = blog.heading || title;
  const slug = `/blog/${blog.slug || ""}/`;
  const content = blog.content;
  const tocItems = content ? extractTableOfContents(content as any[]) : [];

  return <PrimarySecondaryColumnsLayout>
    <main css={css`margin-bottom: 5rem;`}>
      <Breadcrumbs path={[["/", "Home"], ["/blog/", "Blog"], [slug, title]]} css={css({ marginTop: "3em" })} />
      <Article css={css({ h3: { fontSize: "1rem" } })}>
        <H1>{heading}</H1>
        <ShareButtons pageTitle={title} path={pathname} />
        <p>Posted on {blog.date || ""}</p>
        <Columns>
          <MainCol>
            {blog.thumbnail && <div css={css`
              width: 100%; margin: 1.5em auto;
              .gatsby-image-wrapper, picture { width: 100%; height: 20em; }
              img { width: 100%; height: 20em; }
              .gatsby-image-wrapper img, picture img { height: 100%; }
            `}><HeroImage image={blog.thumbnail} alt="" /></div>}
            {content && <BlogContent content={content as any[]} />}
            <footer><ShareButtons pageTitle={title} path={pathname} /></footer>
          </MainCol>
          <SideCol><Contents items={tocItems} /></SideCol>
        </Columns>
      </Article>
    </main>
  </PrimarySecondaryColumnsLayout>;
}

/** Render supported blog dynamic-zone entries.
 * @param props Parsed content entries from the blog record.
 * @returns Rich-text renderers and contact callouts for recognized entries.
 */
function BlogContent({ content }: BlogContentProps) {
  return <>
    {content.map((component, index) => {
      const type = component.__component || component.strapi_component;
      if (type === "generic.rich-text" && component.text) return <StrapiBlocksRenderer key={index} content={component.text} />;
      if (type === "generic.contact-booking-cta") return <ContactBanner key={index} />;
      return null;
    })}
  </>;
}
