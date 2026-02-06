import { ContentsPageItem } from "../components/posts/contents";

// Helper to convert text to URL-friendly slug
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
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
    
    // Second pass: extract headings, treating minLevel as "top level"
    for (const component of content) {
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
            for (const block of component.text) {
                if (block.type === 'heading' && block.level && block.level <= minLevel + 1) {
                    // Extract text from children
                    const headingText = block.children
                        ?.map((child: any) => child.text || '')
                        .join('') || '';
                    
                    if (!headingText.trim()) continue;
                    
                    const slug = slugify(headingText);
                    const item: ContentsPageItem = {
                        title: headingText,
                        url: `#${slug}`,
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
