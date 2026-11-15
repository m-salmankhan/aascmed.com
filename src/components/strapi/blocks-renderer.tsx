// Renders Strapi blocks and dynamic zones with shared headings, controls and prepared images.
import React from 'react';
import {
  BlocksRenderer,
  type BlocksContent,
} from '@strapi/blocks-react-renderer';
import { Image } from '../media/image';
import type { MediaDescriptor } from '../../content/models';
import { DynamicHeading } from '../headings';
import { ContactBanner, ButtonList } from '../posts/shortcode-components';
import { StrapiFAQ } from './faq';
import { headingIds, contentHeadingIds } from '../../utils/strapi-toc';

/** Image block fields owned by Strapi's renderer package. */
type CmsInlineImage = Extract<
  BlocksContent[number],
  { type: 'image' }
>['image'];
/** Optional Astro-generated attributes added at the server content boundary. */
type PreparedInlineImage = CmsInlineImage & {
  responsive?: Pick<MediaDescriptor, 'srcSet' | 'sizes' | 'formats'>;
};

/** Render an embedded image using its prepared responsive attributes when supplied.
 * @param props Strapi image fields plus optional native Astro source candidates.
 * @returns The shared image with optional prepared responsive attributes.
 */
function InlineImageBlock({
  image,
}: {
  image: PreparedInlineImage;
}): React.ReactElement {
  return (
    <Image
      css={{ maxWidth: '100%', height: 'auto' }}
      image={{
        src: image.url,
        alt: image.alternativeText || '',
        width: image.width,
        height: image.height,
        ...image.responsive,
      }}
    />
  );
}

// Sanitize Strapi Blocks content to handle malformed data
const sanitizeBlocksContent = (content: any[]): BlocksContent => {
  return content
    .filter((block) => {
      // Filter out empty paragraphs
      if (
        block.type === 'paragraph' &&
        block.children?.length === 1 &&
        block.children[0]?.text === ''
      ) {
        return false;
      }
      return true;
    })
    .map((original) => {
      const block = { ...original };
      // Ensure children array exists
      if (!block.children) {
        block.children = [];
      }

      // For list items without proper children, filter them out or fix them
      if (block.type === 'list' && Array.isArray(block.children)) {
        block.children = block.children.filter((child: any) => {
          return (
            child.children &&
            Array.isArray(child.children) &&
            child.children.length > 0
          );
        });
      }

      return block;
    })
    .filter((block) => {
      if (
        block.type === 'list' &&
        (!block.children || block.children.length === 0)
      ) {
        return false;
      }
      return true;
    }) as BlocksContent;
};

interface StrapiBlocksRendererProps {
  content: BlocksContent | readonly any[] | any[] | undefined | null;
  className?: string;
  ids?: readonly string[];
}

/**
 * A wrapper around Strapi's BlocksRenderer that sanitizes malformed content
 * (empty paragraphs, list items without children, etc.)
 */
export const StrapiBlocksRenderer: React.FC<StrapiBlocksRendererProps> = ({
  content,
  className,
  ids,
}) => {
  if (!content || !Array.isArray(content) || content.length === 0) {
    return null;
  }

  const anchors = ids || headingIds(content);
  let headingIndex = 0;
  // Attach anchors before sanitizing so filtering other block types cannot shift them.
  const preparedContent = sanitizeBlocksContent(
    content.map((block) =>
      block.type === 'heading'
        ? { ...block, id: anchors[headingIndex++] }
        : block,
    ),
  );
  if (preparedContent.length === 0) return null;

  // Custom block renderers with heading IDs for table of contents
  const blocks = {
    image: InlineImageBlock,
    heading: ({
      children,
      level,
      id,
    }: {
      children?: React.ReactNode;
      level: 1 | 2 | 3 | 4 | 5 | 6;
      id?: string;
    }) => (
      <DynamicHeading level={level} id={id}>
        {children}
      </DynamicHeading>
    ),
  };

  return (
    <div className={className}>
      <BlocksRenderer content={preparedContent} blocks={blocks} />
    </div>
  );
};

interface StrapiDynamicZoneRendererProps {
  content: any[] | undefined | null;
  className?: string;
}

/**
 * Renders Strapi dynamic zone content including rich text, FAQ, and contact CTA components.
 */
export const StrapiDynamicZoneRenderer: React.FC<
  StrapiDynamicZoneRendererProps
> = ({ content, className }) => {
  if (!content || !Array.isArray(content)) return null;

  const anchors = contentHeadingIds(content);

  return (
    <div className={className}>
      {content.map((component, index) => {
        // Read the Strapi dynamic-zone component type.
        const componentType = component.__component;

        // Handle rich text component
        if (componentType === 'generic.rich-text' && component.text) {
          return (
            <StrapiBlocksRenderer
              key={index}
              content={component.text}
              ids={anchors[index]}
            />
          );
        }

        // Handle contact booking CTA component
        if (componentType === 'generic.contact-booking-cta') {
          return <ContactBanner key={index} />;
        }

        // Handle FAQ/Contact/Book Buttons component
        if (componentType === 'generic.faq-contact-book-buttons') {
          return <ButtonList key={index} />;
        }

        // Handle FAQ component
        if (componentType === 'generic.faq' && component.questions) {
          return <StrapiFAQ key={index} questions={component.questions} />;
        }

        return null;
      })}
    </div>
  );
};

export default StrapiBlocksRenderer;
