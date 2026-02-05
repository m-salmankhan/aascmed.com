const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

// Strapi API config
const STRAPI_URL = process.env.STRAPI_URL || 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

if (!STRAPI_TOKEN) {
  console.error('Error: STRAPI_TOKEN environment variable is required');
  process.exit(1);
}

const conditionsDir = path.join(__dirname, '../content/conditions');

// Track uploaded images to avoid duplicates
const uploadedImages = new Map(); // filename -> strapi media id

// Upload an image to Strapi with folder organization
async function uploadImage(imagePath, folderName = 'conditions') {
  const filename = path.basename(imagePath);
  
  // Check if already uploaded
  if (uploadedImages.has(filename)) {
    return uploadedImages.get(filename);
  }
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.error(`    Image not found: ${imagePath}`);
    return null;
  }
  
  const FormData = (await import('formdata-node')).FormData;
  const { fileFromPath } = await import('formdata-node/file-from-path');
  
  const formData = new FormData();
  const file = await fileFromPath(imagePath);
  formData.append('files', file);
  formData.append('path', folderName);
  
  const response = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload image: ${response.status} - ${error}`);
  }
  
  const result = await response.json();
  const mediaId = result[0].id;
  
  uploadedImages.set(filename, mediaId);
  return mediaId;
}

// Parse inline text for bold, links, etc and return Strapi text children
function parseInlineText(text) {
  const children = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    // Check for links: [text](url)
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    // Check for bold: **text**
    const boldMatch = remaining.match(/\*\*([^*]+)\*\*/);
    
    // Find which comes first
    let firstMatch = null;
    let matchType = null;
    
    if (linkMatch && (!boldMatch || linkMatch.index < boldMatch.index)) {
      firstMatch = linkMatch;
      matchType = 'link';
    } else if (boldMatch) {
      firstMatch = boldMatch;
      matchType = 'bold';
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
    
    // Handle JSX shortcode components - return them as special markers
    if (line.trim().startsWith('<ButtonList')) {
      // Flush current paragraph first
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
      // Flush current paragraph first
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
      // Flush current paragraph
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
      // Flush current paragraph
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
      // Flush current paragraph
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
      // Flush current paragraph
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
    
    // Empty line
    if (line.trim() === '' || line.trim() === '\\') {
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
  
  // Flush remaining paragraph
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

// Convert answer text to Strapi blocks format
function answerToBlocks(answerText) {
  const blocks = [];
  
  if (!answerText || typeof answerText !== 'string') {
    return [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];
  }
  
  // Split by double newlines for paragraphs
  const paragraphs = answerText.split(/\n\n+/).filter(p => p.trim());
  
  for (const paragraph of paragraphs) {
    const lines = paragraph.trim().split('\n');
    const joinedText = lines.join(' ').trim();
    
    if (joinedText) {
      blocks.push({
        type: 'paragraph',
        children: parseInlineText(joinedText)
      });
    }
  }
  
  return blocks.length > 0 ? blocks : [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];
}

// Convert MDX condition data to Strapi format
function convertConditionToStrapi(frontmatter, content, filename) {
  const blocks = markdownToBlocks(content);
  
  // Filter out "Frequently Asked Questions" heading since the FAQ component includes it
  const filteredBlocks = blocks.filter(block => {
    if (block.type === 'heading') {
      const headingText = block.children?.[0]?.text?.toLowerCase() || '';
      if (headingText.includes('frequently asked questions') || headingText === 'faq') {
        return false;
      }
    }
    return true;
  });
  
  // Build content array by processing blocks and inserting components at shortcode positions
  const contentArray = [];
  let currentRichTextBlocks = [];
  
  for (const block of filteredBlocks) {
    if (block.type === '__shortcode__') {
      // Flush current rich text blocks before adding component
      if (currentRichTextBlocks.length > 0) {
        contentArray.push({
          __component: 'generic.rich-text',
          text: currentRichTextBlocks
        });
        currentRichTextBlocks = [];
      }
      
      // Add the appropriate component
      if (block.name === 'ButtonList') {
        contentArray.push({
          __component: 'generic.faq-contact-book-buttons'
        });
      } else if (block.name === 'ContactBanner') {
        contentArray.push({
          __component: 'generic.contact-booking-cta'
        });
      }
    } else {
      // Regular block - add to current rich text section
      currentRichTextBlocks.push(block);
    }
  }
  
  // Flush remaining rich text blocks
  if (currentRichTextBlocks.length > 0) {
    contentArray.push({
      __component: 'generic.rich-text',
      text: currentRichTextBlocks
    });
  }
  
  // Add FAQ component at the end if it exists (skip if SKIP_FAQ env var is set)
  if (!process.env.SKIP_FAQ && frontmatter.faq && Array.isArray(frontmatter.faq) && frontmatter.faq.length > 0) {
    contentArray.push({
      __component: 'generic.faq',
      questions: frontmatter.faq.map(item => ({
        question: item.question,
        answer: answerToBlocks(item.answer)
      }))
    });
  }
  
  // Use filename (without extension) as the slug
  const slug = filename.replace(/\.mdx$/, '');
  
  return {
    title: frontmatter.title,
    heading: frontmatter.heading || frontmatter.title,
    slug: slug,
    order: frontmatter.order || 0,
    description: frontmatter.description,
    content: contentArray
  };
}

// Extract thumbnail path from frontmatter
function getThumbnailPath(thumbnail) {
  if (!thumbnail) return null;
  
  // Handle different path formats
  // e.g., "food-chemical-insects.jpg"
  return path.join(conditionsDir, thumbnail);
}

async function createCondition(conditionData) {
  // Debug: write full data to file for inspection
  if (process.env.DEBUG) {
    fs.writeFileSync('debug-condition-data.json', JSON.stringify({ data: conditionData }, null, 2));
    console.log('  - Debug data written to debug-condition-data.json');
  }
  
  const response = await fetch(`${STRAPI_URL}/api/conditions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ data: conditionData })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create condition: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function updateConditionThumbnail(documentId, mediaId) {
  const response = await fetch(`${STRAPI_URL}/api/conditions/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ 
      data: { 
        thumbnail: mediaId
      } 
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update thumbnail: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function publishCondition(documentId) {
  const response = await fetch(`${STRAPI_URL}/api/conditions/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ 
      data: { 
        publishedAt: new Date().toISOString() 
      } 
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to publish condition: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function main() {
  const files = fs.readdirSync(conditionsDir).filter(f => f.endsWith('.mdx'));
  
  console.log(`Found ${files.length} condition files to migrate\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const filePath = path.join(conditionsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    console.log(`Processing: ${frontmatter.title}`);
    
    try {
      const strapiData = convertConditionToStrapi(frontmatter, content, file);
      console.log(`  - Converted to Strapi format (slug: ${strapiData.slug})`);
      
      // Create the condition entry
      const result = await createCondition(strapiData);
      const documentId = result.data.documentId;
      console.log(`  - Created in Strapi (ID: ${result.data.id})`);
      
      // Upload and attach thumbnail if it exists
      if (frontmatter.thumbnail) {
        const thumbnailPath = getThumbnailPath(frontmatter.thumbnail);
        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
          console.log(`  - Uploading thumbnail: ${path.basename(thumbnailPath)}`);
          const mediaId = await uploadImage(thumbnailPath, 'conditions');
          if (mediaId) {
            await updateConditionThumbnail(documentId, mediaId);
            console.log(`  - Thumbnail attached`);
          }
        } else {
          console.log(`  - Thumbnail not found: ${frontmatter.thumbnail}`);
        }
      }
      
      // Publish the condition
      await publishCondition(documentId);
      console.log(`  - Published`);
      
      console.log(`  ✓ Done\n`);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}\n`);
      errorCount++;
    }
  }
  
  console.log(`Migration complete! Success: ${successCount}, Errors: ${errorCount}`);
  console.log(`Unique images uploaded: ${uploadedImages.size}`);
}

main().catch(console.error);
