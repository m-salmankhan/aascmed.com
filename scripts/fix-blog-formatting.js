/**
 * Fix malformed MDX blog content:
 * 1. Remove trailing backslashes from headings
 * 2. Merge headings split across multiple lines (### \ followed by content)
 * 3. Fix skipped heading levels (ensure h2 -> h3 -> h4 hierarchy)
 * 4. Remove empty heading lines
 */

const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '../content/blog');

function fixBlogFile(filePath) {
    const fileName = path.basename(filePath);
    let content = fs.readFileSync(filePath, 'utf-8');
    let originalContent = content;
    let changes = [];

    // Split into frontmatter and body
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!frontmatterMatch) {
        console.log(`  ⚠️  ${fileName}: Could not parse frontmatter`);
        return false;
    }

    const frontmatter = frontmatterMatch[1];
    let body = frontmatterMatch[2];

    // Fix 1: Merge split headings (### \ followed by link on next line)
    // Pattern: heading marker + backslash + newline + content
    const splitHeadingRegex = /^(#{1,6})\s*\\\s*\n+(\[.*?\]\(.*?\))\s*\\\s*$/gm;
    body = body.replace(splitHeadingRegex, (match, hashes, link) => {
        changes.push(`Merged split heading: ${hashes} ${link.substring(0, 50)}...`);
        return `${hashes} ${link}`;
    });

    // Fix 2: Remove standalone empty heading lines (### \ or #### \ etc)
    // These are headings that are just backslashes with no content
    const emptyHeadingRegex = /^(#{1,6})\s*\\\s*$/gm;
    let emptyCount = 0;
    body = body.replace(emptyHeadingRegex, (match) => {
        emptyCount++;
        return '';
    });
    if (emptyCount > 0) {
        changes.push(`Removed ${emptyCount} empty heading lines`);
    }

    // Fix 3: Remove trailing backslashes from headings with content
    const trailingBackslashRegex = /^(#{1,6}\s+.+?)\\\s*$/gm;
    body = body.replace(trailingBackslashRegex, (match, heading) => {
        changes.push(`Removed trailing backslash from: ${heading.substring(0, 50)}...`);
        return heading;
    });

    // Fix 4: Clean up multiple consecutive blank lines
    body = body.replace(/\n{4,}/g, '\n\n\n');

    // Fix 5: Fix heading levels - ensure proper hierarchy
    // First, analyze the heading structure
    const lines = body.split('\n');
    const headingPattern = /^(#{1,6})\s+(.+)$/;
    
    // Find all headings and their levels
    let headings = [];
    lines.forEach((line, idx) => {
        const match = line.match(headingPattern);
        if (match) {
            headings.push({
                index: idx,
                level: match[1].length,
                text: match[2],
                original: line
            });
        }
    });

    // Determine the minimum heading level used (excluding FAQ sections which may use ##)
    // The main content should start at h2 or h3
    let minLevel = Math.min(...headings.map(h => h.level));
    
    // If min level is 3 or higher, we should normalize to start at h2
    // If h2 is used, that's fine - content headings start at h3
    
    // Fix skipped levels: if we have h2 -> h4, change h4 to h3
    // Build expected levels
    let lastLevel = 1; // Start assuming h1 is the page title (handled by template)
    let fixedLines = [...lines];
    let levelFixes = 0;

    for (const heading of headings) {
        const expectedMaxLevel = lastLevel + 1;
        
        // If this heading skips a level (e.g., h2 -> h4)
        if (heading.level > expectedMaxLevel && heading.level > 2) {
            const newLevel = expectedMaxLevel;
            const newHashes = '#'.repeat(newLevel);
            const newLine = `${newHashes} ${heading.text}`;
            fixedLines[heading.index] = newLine;
            levelFixes++;
            changes.push(`Fixed heading level: h${heading.level} -> h${newLevel}: ${heading.text.substring(0, 40)}...`);
            lastLevel = newLevel;
        } else {
            lastLevel = heading.level;
        }
    }

    body = fixedLines.join('\n');

    // Reconstruct the file
    const newContent = `---\n${frontmatter}\n---\n${body}`;

    if (newContent !== originalContent) {
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`  ✅ ${fileName}:`);
        changes.forEach(c => console.log(`      - ${c}`));
        return true;
    }

    return false;
}

function main() {
    console.log('🔧 Fixing malformed blog MDX files...\n');

    const files = fs.readdirSync(BLOG_DIR)
        .filter(f => f.endsWith('.mdx'))
        .map(f => path.join(BLOG_DIR, f));

    console.log(`Found ${files.length} MDX files\n`);

    let fixedCount = 0;
    for (const file of files) {
        if (fixBlogFile(file)) {
            fixedCount++;
        }
    }

    console.log(`\n✨ Fixed ${fixedCount} files`);
}

main();
