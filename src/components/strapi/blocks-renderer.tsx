import React from "react";
import { BlocksRenderer, type BlocksContent } from "@strapi/blocks-react-renderer";
import { DynamicHeading } from "../headings";
import { ContactBanner } from "../posts/shortcode-components";
import { StrapiFAQ } from "./faq";

// Helper to convert text to URL-friendly slug
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

// Sanitize Strapi Blocks content to handle malformed data
const sanitizeBlocksContent = (content: any[]): BlocksContent => {
    return content
        .filter(block => {
            // Filter out empty paragraphs
            if (block.type === 'paragraph' && block.children?.length === 1 && block.children[0]?.text === '') {
                return false;
            }
            return true;
        })
        .map(block => {
            // Ensure children array exists
            if (!block.children) {
                block.children = [];
            }
            
            // For list items without proper children, filter them out or fix them
            if (block.type === 'list' && Array.isArray(block.children)) {
                block.children = block.children.filter((child: any) => {
                    return child.children && Array.isArray(child.children) && child.children.length > 0;
                });
            }
            
            return block;
        })
        .filter(block => {
            if (block.type === 'list' && (!block.children || block.children.length === 0)) {
                return false;
            }
            return true;
        }) as BlocksContent;
}

interface StrapiBlocksRendererProps {
    content: BlocksContent | readonly any[] | any[] | undefined | null;
    className?: string;
}

// Extract text from raw Strapi block children (before React rendering)
function getTextFromBlockChildren(children: any[]): string {
    if (!children || !Array.isArray(children)) return '';
    return children.map(child => {
        if (child.text) return child.text;
        if (child.children) return getTextFromBlockChildren(child.children);
        return '';
    }).join('');
}

// Build a map of heading texts to IDs from raw content
function buildHeadingIdMap(content: any[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const block of content) {
        if (block.type === 'heading' && block.children) {
            const text = getTextFromBlockChildren(block.children);
            if (text) {
                map.set(text, slugify(text));
            }
        }
    }
    return map;
}

/**
 * A wrapper around Strapi's BlocksRenderer that sanitizes malformed content
 * (empty paragraphs, list items without children, etc.)
 */
export const StrapiBlocksRenderer: React.FC<StrapiBlocksRendererProps> = ({ content, className }) => {
    if (!content || !Array.isArray(content) || content.length === 0) {
        return null;
    }

    // Create a mutable copy of the content
    const mutableContent = [...content] as any[];
    const sanitizedContent = sanitizeBlocksContent(mutableContent);
    
    if (sanitizedContent.length === 0) {
        return null;
    }

    // Build heading ID map from raw content
    const headingIdMap = buildHeadingIdMap(mutableContent);
    
    // Track heading index for matching
    let headingIndex = 0;
    const headingTexts = Array.from(headingIdMap.keys());

    // Custom block renderers with heading IDs for table of contents
    const blocks = {
        heading: ({ children, level }: { children?: React.ReactNode; level: 1 | 2 | 3 | 4 | 5 | 6 }) => {
            const text = headingTexts[headingIndex] || '';
            const id = headingIdMap.get(text) || '';
            headingIndex++;
            return <DynamicHeading level={level} id={id}>{children}</DynamicHeading>;
        },
    };

    return (
        <div className={className}>
            <BlocksRenderer content={sanitizedContent} blocks={blocks} />
        </div>
    );
}

interface StrapiDynamicZoneRendererProps {
    content: any[] | undefined | null;
    className?: string;
}

/**
 * Renders Strapi dynamic zone content including rich text, FAQ, and contact CTA components.
 */
export const StrapiDynamicZoneRenderer: React.FC<StrapiDynamicZoneRendererProps> = ({ content, className }) => {
    if (!content || !Array.isArray(content)) return null;

    return (
        <div className={className}>
            {content.map((component, index) => {
                // Handle rich text component
                if (component.strapi_component === 'generic.rich-text' && component.text) {
                    return (
                        <StrapiBlocksRenderer key={index} content={component.text} />
                    );
                }
                
                // Handle contact booking CTA component
                if (component.strapi_component === 'generic.contact-booking-cta') {
                    return <ContactBanner key={index} />;
                }
                
                // Handle FAQ component
                if (component.strapi_component === 'generic.faq' && component.questions) {
                    return <StrapiFAQ key={index} questions={component.questions} />;
                }

                return null;
            })}
        </div>
    );
}

export default StrapiBlocksRenderer;
