import { ContentsPageItem } from "../components/posts/contents";

// Shared by rendered heading anchors and their table of contents links.
export function slugify(text: string): string {
    return text.normalize('NFKC').toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim().replace(/[\s-]+/g, '-').replace(/^-|-$/g, '') || 'section';
}

export function headingText(children: any[]): string {
    if (!Array.isArray(children)) return '';
    return children.map(child => typeof child.text === 'string' ? child.text : headingText(child.children)).join('');
}

export function headingIds(blocks: readonly any[], used = new Set<string>()): string[] {
    return blocks.filter(block => block.type === 'heading').map(block => {
        const slug = slugify(headingText(block.children));
        let id = slug;
        let suffix = 2;
        while (used.has(id)) id = `${slug}-${suffix++}`;
        used.add(id);
        return id;
    });
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
    
    const usedIds = new Set(content.some(component => (component.__component || component.strapi_component) === 'generic.faq') ? ['faq'] : []);
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
            const ids = headingIds(component.text, usedIds);
            let headingIndex = 0;
            for (const block of component.text) {
                const id = block.type === 'heading' ? ids[headingIndex++] : undefined;
                if (block.type === 'heading' && block.level && block.level <= minLevel + 1) {
                    const text = headingText(block.children);
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
