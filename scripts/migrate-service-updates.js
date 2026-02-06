const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Strapi API config
let STRAPI_URL = process.env.STRAPI_URL || process.env.GATSBY_STRAPI_API_URL || 'http://localhost:1337';
// Remove trailing slash if present
STRAPI_URL = STRAPI_URL.replace(/\/$/, '');
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.error('Error: STRAPI_TOKEN environment variable is required');
  process.exit(1);
}

const serviceUpdatesDir = path.join(__dirname, '../content/service-updates-archive');

// Parse inline text for bold, links, etc and return Strapi text children
function parseInlineText(text) {
  const children = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    // Check for links: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // Check for bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    // Check for italic: *text* or _text_
    const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)|_([^_]+)_/);
    
    // Find which comes first
    let firstMatch = null;
    let matchType = null;
    
    if (linkMatch && (!boldMatch || linkMatch.index < boldMatch.index) && (!italicMatch || linkMatch.index < italicMatch.index)) {
      firstMatch = linkMatch;
      matchType = 'link';
    } else if (boldMatch && (!italicMatch || boldMatch.index < italicMatch.index)) {
      firstMatch = boldMatch;
      matchType = 'bold';
    } else if (italicMatch) {
      firstMatch = italicMatch;
      matchType = 'italic';
    }
    
    if (!firstMatch) {
      // No more matches, add remaining text
      if (remaining.trim()) {
        children.push({ type: 'text', text: remaining });
      }
      break;
    }
    
    // Add text before the match
    if (firstMatch.index > 0) {
      const beforeText = remaining.substring(0, firstMatch.index);
      if (beforeText) {
        children.push({ type: 'text', text: beforeText });
      }
    }
    
    // Add the match
    if (matchType === 'link') {
      children.push({
        type: 'link',
        url: firstMatch[2],
        children: [{ type: 'text', text: firstMatch[1] }]
      });
    } else if (matchType === 'bold') {
      children.push({ type: 'text', text: firstMatch[1], bold: true });
    } else if (matchType === 'italic') {
      const italicText = firstMatch[1] || firstMatch[2];
      children.push({ type: 'text', text: italicText, italic: true });
    }
    
    // Continue with remaining text
    remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
  }
  
  // If no children, return plain text
  if (children.length === 0) {
    return [{ type: 'text', text: text || '' }];
  }
  
  return children;
}

// Convert markdown body to Strapi blocks format
function markdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  let currentParagraph = [];
  let inCodeBlock = false;
  let codeBlockContent = [];
  
  for (const line of lines) {
    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push({
          type: 'code',
          children: [{ type: 'text', text: codeBlockContent.join('\n') }]
        });
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block - flush paragraph first
        if (currentParagraph.length > 0) {
          const paragraphText = currentParagraph.join(' ').trim();
          if (paragraphText) {
            blocks.push({
              type: 'paragraph',
              children: parseInlineText(paragraphText)
            });
          }
          currentParagraph = [];
        }
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
    // Skip import statements and export statements
    if (line.startsWith('import ') || line.startsWith('export ')) {
      continue;
    }
    
    // Handle JSX shortcode components
    if (line.trim().startsWith('<ButtonList')) {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          blocks.push({
            type: 'paragraph',
            children: parseInlineText(paragraphText)
          });
        }
        currentParagraph = [];
      }
      blocks.push({ type: '__shortcode__', name: 'ButtonList' });
      continue;
    }
    
    if (line.trim().startsWith('<ContactBanner')) {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          blocks.push({
            type: 'paragraph',
            children: parseInlineText(paragraphText)
          });
        }
        currentParagraph = [];
      }
      blocks.push({ type: '__shortcode__', name: 'ContactBanner' });
      continue;
    }
    
    // Skip other JSX components
    if (line.trim().startsWith('<') && !line.trim().startsWith('</')) {
      continue;
    }

    // Headings (h1-h6)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          blocks.push({
            type: 'paragraph',
            children: parseInlineText(paragraphText)
          });
        }
        currentParagraph = [];
      }
      
      const level = headingMatch[1].length;
      const headingText = headingMatch[2].replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      blocks.push({
        type: 'heading',
        level: Math.min(level, 6),
        children: [{ type: 'text', text: headingText }]
      });
      continue;
    }
    
    // Numbered list item
    const numberedListMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedListMatch) {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          blocks.push({
            type: 'paragraph',
            children: parseInlineText(paragraphText)
          });
        }
        currentParagraph = [];
      }
      
      const lastBlock = blocks[blocks.length - 1];
      const listItemText = numberedListMatch[2];
      
      if (lastBlock && lastBlock.type === 'list' && lastBlock.format === 'ordered') {
        lastBlock.children.push({
          type: 'list-item',
          children: parseInlineText(listItemText)
        });
      } else {
        blocks.push({
          type: 'list',
          format: 'ordered',
          children: [{
            type: 'list-item',
            children: parseInlineText(listItemText)
          }]
        });
      }
      continue;
    }
    
    // Unordered list item
    if (line.match(/^[-*]\s+/)) {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          blocks.push({
            type: 'paragraph',
            children: parseInlineText(paragraphText)
          });
        }
        currentParagraph = [];
      }
      
      const lastBlock = blocks[blocks.length - 1];
      const listItemText = line.replace(/^[-*]\s+/, '');
      
      if (lastBlock && lastBlock.type === 'list' && lastBlock.format === 'unordered') {
        lastBlock.children.push({
          type: 'list-item',
          children: parseInlineText(listItemText)
        });
      } else {
        blocks.push({
          type: 'list',
          format: 'unordered',
          children: [{
            type: 'list-item',
            children: parseInlineText(listItemText)
          }]
        });
      }
      continue;
    }
    
    // Blockquote
    if (line.startsWith('> ')) {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          blocks.push({
            type: 'paragraph',
            children: parseInlineText(paragraphText)
          });
        }
        currentParagraph = [];
      }
      
      blocks.push({
        type: 'quote',
        children: parseInlineText(line.substring(2))
      });
      continue;
    }
    
    // Empty line - flush paragraph
    if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          blocks.push({
            type: 'paragraph',
            children: parseInlineText(paragraphText)
          });
        }
        currentParagraph = [];
      }
      continue;
    }
    
    // Regular text - add to current paragraph
    currentParagraph.push(line);
  }
  
  // Flush any remaining paragraph
  if (currentParagraph.length > 0) {
    const paragraphText = currentParagraph.join(' ').trim();
    if (paragraphText) {
      blocks.push({
        type: 'paragraph',
        children: parseInlineText(paragraphText)
      });
    }
  }
  
  return blocks;
}

// Build the body dynamic zone from markdown
function buildBody(content) {
  const blocks = markdownToBlocks(content);
  const bodyComponents = [];
  let currentRichTextBlocks = [];
  
  for (const block of blocks) {
    if (block.type === '__shortcode__') {
      // Flush current rich text
      if (currentRichTextBlocks.length > 0) {
        bodyComponents.push({
          __component: 'generic.rich-text',
          text: currentRichTextBlocks
        });
        currentRichTextBlocks = [];
      }
      
      // Add the shortcode component
      if (block.name === 'ButtonList') {
        bodyComponents.push({
          __component: 'generic.faq-contact-book-buttons'
        });
      } else if (block.name === 'ContactBanner') {
        bodyComponents.push({
          __component: 'generic.contact-booking-cta'
        });
      }
    } else {
      currentRichTextBlocks.push(block);
    }
  }
  
  // Add remaining rich text blocks
  if (currentRichTextBlocks.length > 0) {
    bodyComponents.push({
      __component: 'generic.rich-text',
      text: currentRichTextBlocks
    });
  }
  
  return bodyComponents;
}

// Build body as simple rich text (not dynamic zone)
function buildSimpleBody(content) {
  return markdownToBlocks(content);
}

// Generate slug from filename
function generateSlug(filename) {
  return filename
    .replace(/\.mdx?$/, '')
    .toLowerCase()
    .replace(/\s+/g, '-');
}

// Migrate a single service update
async function migrateServiceUpdate(filename) {
  const filePath = path.join(serviceUpdatesDir, filename);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content } = matter(fileContent);
  
  console.log(`\nProcessing: ${filename}`);
  
  // Extract frontmatter fields
  const title = frontmatter.title || 'Untitled';
  const date = frontmatter.date ? new Date(frontmatter.date).toISOString() : new Date().toISOString();
  const description = frontmatter.description || '';
  const slug = generateSlug(filename);
  
  console.log(`  Title: ${title}`);
  console.log(`  Date: ${date}`);
  console.log(`  Slug: ${slug}`);
  
  // Build body as simple rich text (not dynamic zone)
  const body = buildSimpleBody(content);
  
  // Prepare Strapi data
  const strapiData = {
    data: {
      title,
      slug,
      date,
      description,
      body
    }
  };
  
  // Create in Strapi
  const response = await fetch(`${STRAPI_URL}/api/service-updates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify(strapiData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`  ❌ Failed to create: ${response.status}`);
    console.error(`  Error: ${errorText}`);
    return false;
  }
  
  const result = await response.json();
  console.log(`  ✅ Created with ID: ${result.data.id}`);
  return true;
}

// Main migration function
async function migrate() {
  console.log('='.repeat(60));
  console.log('Service Updates Migration to Strapi');
  console.log('='.repeat(60));
  console.log(`Strapi URL: ${STRAPI_URL}`);
  console.log(`Source directory: ${serviceUpdatesDir}`);
  
  // Get all MDX files
  const files = fs.readdirSync(serviceUpdatesDir)
    .filter(f => f.endsWith('.mdx') || f.endsWith('.md'))
    .filter(f => f.toLowerCase() !== 'readme.md');
  
  console.log(`\nFound ${files.length} service update(s) to migrate`);
  
  let success = 0;
  let failed = 0;
  
  for (const file of files) {
    try {
      const result = await migrateServiceUpdate(file);
      if (result) {
        success++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`  ❌ Error migrating ${file}:`, error.message);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Migration Complete');
  console.log('='.repeat(60));
  console.log(`✅ Success: ${success}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${files.length}`);
}

// Run migration
migrate().catch(console.error);
