import { extractTextFromChildren } from "./strapi-excerpt";
import type { ContentsPageItem } from "../components/posts/contents";

// Shared by rendered heading anchors and their table of contents links.
export function slugify(text: string): string {
    return text.normalize('NFKC').toLowerCase()
        .replace(/[^\p{L}\p{N}_\s-]/gu, '')
        .trim().replace(/[\s-]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

export function headingIds(blocks: readonly any[], used = new Set<string>()): string[] {
    return blocks.filter(block => block.type === 'heading').map(block => {
        const slug = slugify(extractTextFromChildren(block.children));
        let id = slug;
        let suffix = 2;
        while (used.has(id)) id = `${slug}-${suffix++}`;
        used.add(id);
        return id;
    });
}

/** Allocate anchors once across every rich-text section, reserving the FAQ section ID. */
export function contentHeadingIds(content: readonly any[]): string[][] {
    const used = new Set<string>(content.some(component => (component.__component || component.strapi_component) === 'generic.faq') ? ['faq'] : []);
    return content.map(component => (component.__component || component.strapi_component) === 'generic.rich-text' && Array.isArray(component.text)
        ? headingIds(component.text, used) : []);
}

// Extract table of contents from Strapi dynamic zone content
export function extractTableOfContents(content: any[]): ContentsPageItem[] {
    const tocItems: ContentsPageItem[] = [];
    
    if (!content || !Array.isArray(content)) return tocItems;
    
    // First pass: find the minimum heading level used
    let minLevel = 6;
    for (const component of content) {
        const componentType = component.__component || component.strapi_component;
        if (componentType === 'generic.rich-text' && component.text) {
            for (const block of component.text) {
                if (block.type === 'heading' && block.level) {
                    minLevel = Math.min(minLevel, block.level);
                }
            }
        }
    }
    
    const anchors = contentHeadingIds(content);
    // Second pass: extract headings, treating minLevel as "top level"
    for (const [index, component] of content.entries()) {
        const componentType = component.__component || component.strapi_component;
        
        // Handle FAQ component - add to TOC
        if (componentType === 'generic.faq') {
            tocItems.push({
                title: 'Frequently Asked Questions',
                url: '#faq',
            });
            continue;
        }
        
        if (componentType === 'generic.rich-text' && component.text) {
            const ids = anchors[index];
            let headingIndex = 0;
            for (const block of component.text) {
                const id = block.type === 'heading' ? ids[headingIndex++] : undefined;
                if (block.type === 'heading' && block.level && block.level <= minLevel + 1) {
                    const text = extractTextFromChildren(block.children);
                    if (!text.trim()) continue;
                    const item: ContentsPageItem = {
                        title: text,
                        url: `#${id}`,
                    };
                    
                    // Top-level heading (e.g., h2 or h3 if no h2s exist)
                    if (block.level === minLevel) {
                        tocItems.push(item);
                    }
                    // Sub-heading (one level deeper), nest under the last top-level heading
                    else if (block.level === minLevel + 1 && tocItems.length > 0) {
                        const lastTopLevel = tocItems[tocItems.length - 1];
                        if (!lastTopLevel.items) lastTopLevel.items = [];
                        lastTopLevel.items.push(item);
                    }
                }
            }
        }
    }
    
    return tocItems;
}
