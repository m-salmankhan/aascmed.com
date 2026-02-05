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

const providersDir = path.join(__dirname, '../content/providers');

// Track uploaded images to avoid duplicates
const uploadedImages = new Map(); // filename -> strapi media id

// Map MDX title to Strapi honorific enum
function mapHonorific(title) {
  if (!title) return 'None';
  const normalized = title.toLowerCase().replace(/\./g, '');
  switch (normalized) {
    case 'dr':
      return 'Dr.';
    case 'prof':
      return 'Prof.';
    case 'mr':
      return 'Mr.';
    case 'mrs':
      return 'Mrs.';
    case 'mx':
      return 'Mx.';
    default:
      return 'None';
  }
}

// Upload an image to Strapi with folder organization
async function uploadImage(imagePath, folderName = 'providers') {
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

// Parse review text to extract structured data
function parseReview(reviewText) {
  if (!reviewText || !reviewText.trim() || reviewText.trim() === '') {
    return null;
  }
  
  // The review format is typically:
  // Review text...
  // 
  // Reviewer Name — Date
  // 
  // (Read more reviews on [zocdoc.com](url))
  
  const lines = reviewText.trim().split('\n').filter(l => l.trim());
  
  if (lines.length === 0) {
    return null;
  }
  
  // Find the attribution line (contains — or -)
  let reviewLines = [];
  let attribution = '';
  let moreReviewsText = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for "Read more reviews" line
    if (line.startsWith('(Read more')) {
      moreReviewsText = line;
      continue;
    }
    
    // Check for attribution line (Name — Date or Name - Date)
    if (line.includes('—') || (line.includes(' - ') && !line.startsWith('['))) {
      attribution = line;
      continue;
    }
    
    // Regular review text
    if (line) {
      reviewLines.push(line);
    }
  }
  
  const reviewBody = reviewLines.join(' ').trim();
  
  if (!reviewBody) {
    return null;
  }
  
  // Build the full review text with attribution
  let fullText = reviewBody;
  if (attribution) {
    fullText += '\n\n' + attribution;
  }
  if (moreReviewsText) {
    fullText += '\n\n' + moreReviewsText;
  }
  
  // Convert to Strapi blocks format
  const blocks = [];
  
  // Add the review body as a paragraph
  blocks.push({
    type: 'paragraph',
    children: parseInlineText(reviewBody)
  });
  
  // Add attribution if exists
  if (attribution) {
    blocks.push({
      type: 'paragraph',
      children: [{ type: 'text', text: attribution, italic: true }]
    });
  }
  
  // Add "Read more" link if exists
  if (moreReviewsText) {
    blocks.push({
      type: 'paragraph',
      children: parseInlineText(moreReviewsText)
    });
  }
  
  return {
    text: blocks
  };
}

// Convert MDX provider data to Strapi format
function convertProviderToStrapi(frontmatter, content, filename) {
  const blocks = markdownToBlocks(content);
  
  // Build body array by processing blocks and inserting components at shortcode positions
  const bodyArray = [];
  let currentRichTextBlocks = [];
  
  for (const block of blocks) {
    if (block.type === '__shortcode__') {
      // Flush current rich text blocks before adding component
      if (currentRichTextBlocks.length > 0) {
        bodyArray.push({
          __component: 'generic.rich-text',
          text: currentRichTextBlocks
        });
        currentRichTextBlocks = [];
      }
      
      // Add the appropriate component
      if (block.name === 'ButtonList') {
        bodyArray.push({
          __component: 'generic.faq-contact-book-buttons'
        });
      } else if (block.name === 'ContactBanner') {
        bodyArray.push({
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
    bodyArray.push({
      __component: 'generic.rich-text',
      text: currentRichTextBlocks
    });
  }
  
  // Use filename (without extension) as the slug
  const slug = filename.replace(/\.mdx$/, '');
  
  // Build the provider data
  const providerData = {
    slug: slug,
    description: frontmatter.description || '',
    order: frontmatter.order ?? 5,
    name: {
      fullName: frontmatter.name?.fullname || frontmatter.title || '',
      qualificationLong: frontmatter.name?.degree || '',
      qualificationAbbr: frontmatter.name?.['degree-abbr'] || frontmatter.name?.degree_abbr || '',
      honorific: mapHonorific(frontmatter.name?.title)
    },
    body: bodyArray
  };
  
  // Add review if exists and has content
  const review = parseReview(frontmatter.review);
  if (review) {
    // Skip reviews for now - they're out of date
    // providerData.review = review;
  }
  
  // Add retirement notice if exists
  if (frontmatter.retirement) {
    // Parse the retired-notice-text which may contain markdown links
    let noticeText = frontmatter.retirement['retired-notice-text'] || frontmatter.retirement.retired_notice_text || '';
    
    providerData.retirementNotice = {
      retired: frontmatter.retirement.retired || false,
      text: noticeText ? [{
        type: 'paragraph',
        children: parseInlineText(noticeText)
      }] : []
    };
  }
  
  return providerData;
}

// Get image path from frontmatter
function getImagePath(image) {
  if (!image) return null;
  return path.join(providersDir, image);
}

async function createProvider(providerData) {
  // Debug: write full data to file for inspection
  if (process.env.DEBUG) {
    fs.writeFileSync('debug-provider-data.json', JSON.stringify({ data: providerData }, null, 2));
    console.log('  - Debug data written to debug-provider-data.json');
  }
  
  const response = await fetch(`${STRAPI_URL}/api/providers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ data: providerData })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create provider: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function updateProviderImage(documentId, mediaId) {
  const response = await fetch(`${STRAPI_URL}/api/providers/${documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ 
      data: { 
        image: mediaId
      } 
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update image: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function publishProvider(documentId) {
  const response = await fetch(`${STRAPI_URL}/api/providers/${documentId}`, {
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
    throw new Error(`Failed to publish provider: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function main() {
  const files = fs.readdirSync(providersDir).filter(f => f.endsWith('.mdx'));
  
  console.log(`Found ${files.length} provider files to migrate\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const filePath = path.join(providersDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    console.log(`Processing: ${frontmatter.title || frontmatter.name?.fullname}`);
    
    try {
      const strapiData = convertProviderToStrapi(frontmatter, content, file);
      console.log(`  - Converted to Strapi format (slug: ${strapiData.slug})`);
      
      // Create the provider entry
      const result = await createProvider(strapiData);
      const documentId = result.data.documentId;
      console.log(`  - Created in Strapi (ID: ${result.data.id})`);
      
      // Upload and attach image if it exists
      if (frontmatter.image) {
        const imagePath = getImagePath(frontmatter.image);
        if (imagePath && fs.existsSync(imagePath)) {
          console.log(`  - Uploading image: ${path.basename(imagePath)}`);
          const mediaId = await uploadImage(imagePath, 'providers');
          if (mediaId) {
            await updateProviderImage(documentId, mediaId);
            console.log(`  - Image attached`);
          }
        } else {
          console.log(`  - Image not found: ${frontmatter.image}`);
        }
      }
      
      // Publish the provider
      await publishProvider(documentId);
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
