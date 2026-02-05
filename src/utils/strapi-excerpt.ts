// Extract plain text from Strapi blocks (rich text children)
function extractTextFromChildren(children: any[]): string {
    if (!children || !Array.isArray(children)) return '';
    return children.map((child: any) => child.text || '').join('');
}

// Extract plain text from Strapi dynamic zone content
export function extractPlainText(content: any[]): string {
    if (!content || !Array.isArray(content)) return '';
    
    const textParts: string[] = [];
    
    for (const component of content) {
        const componentType = component.__component || component.strapi_component;
        
        if (componentType === 'generic.rich-text' && component.text) {
            for (const block of component.text) {
                if (block.type === 'paragraph' || block.type === 'heading') {
                    const text = extractTextFromChildren(block.children);
                    if (text.trim()) {
                        textParts.push(text.trim());
                    }
                }
            }
        }
    }
    
    return textParts.join(' ');
}

// Create an excerpt from Strapi dynamic zone content
export function createExcerpt(content: any[], maxLength: number = 160): string {
    const plainText = extractPlainText(content);
    
    if (plainText.length <= maxLength) {
        return plainText;
    }
    
    // Truncate at word boundary
    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.7) {
        return truncated.substring(0, lastSpace) + '…';
    }
    
    return truncated + '…';
}
