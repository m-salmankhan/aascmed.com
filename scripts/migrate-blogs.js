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

const blogsDir = path.join(__dirname, '../content/blog-archive');

// Track uploaded images to avoid duplicates
const uploadedImages = new Map(); // filename -> strapi media id

// Upload an image to Strapi
async function uploadImage(imagePath) {
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
    
    // Skip import statements and JSX components
    if (line.startsWith('import ') || line.startsWith('<') || line.startsWith('export ')) {
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

// Convert MDX blog data to Strapi format
function convertBlogToStrapi(frontmatter, content) {
  const blocks = markdownToBlocks(content);
  
  return {
    title: frontmatter.title,
    heading: frontmatter.heading || frontmatter.title,
    slug: frontmatter.slug,
    description: frontmatter.description,
    date: frontmatter.date,
    content: [
      {
        __component: 'generic.rich-text',
        text: blocks
      }
    ]
  };
}

// Extract thumbnail path from frontmatter
function getThumbnailPath(thumbnail) {
  if (!thumbnail) return null;
  
  // Handle different path formats
  // e.g., "content/blog-archive/steptodown.com748119.jpg"
  if (thumbnail.startsWith('content/blog-archive/')) {
    return path.join(__dirname, '..', thumbnail);
  }
  // Legacy path format
  if (thumbnail.startsWith('content/blog/')) {
    return path.join(__dirname, '..', thumbnail.replace('content/blog/', 'content/blog-archive/'));
  }
  
  // If it's just a filename, look in the blog directory
  return path.join(blogsDir, thumbnail);
}

async function createBlog(blogData) {
  const response = await fetch(`${STRAPI_URL}/api/blogs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ data: blogData })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create blog: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function updateBlogThumbnail(documentId, mediaId) {
  const response = await fetch(`${STRAPI_URL}/api/blogs/${documentId}`, {
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

async function publishBlog(documentId) {
  const response = await fetch(`${STRAPI_URL}/api/blogs/${documentId}`, {
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
    throw new Error(`Failed to publish blog: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function main() {
  const files = fs.readdirSync(blogsDir).filter(f => f.endsWith('.mdx'));
  
  console.log(`Found ${files.length} blog files to migrate\n`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const filePath = path.join(blogsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    console.log(`Processing: ${frontmatter.title}`);
    
    try {
      const strapiData = convertBlogToStrapi(frontmatter, content);
      console.log(`  - Converted to Strapi format`);
      
      // Create the blog entry
      const result = await createBlog(strapiData);
      const documentId = result.data.documentId;
      console.log(`  - Created in Strapi (ID: ${result.data.id})`);
      
      // Upload and attach thumbnail if it exists
      if (frontmatter.thumbnail) {
        const thumbnailPath = getThumbnailPath(frontmatter.thumbnail);
        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
          console.log(`  - Uploading thumbnail: ${path.basename(thumbnailPath)}`);
          const mediaId = await uploadImage(thumbnailPath);
          if (mediaId) {
            await updateBlogThumbnail(documentId, mediaId);
            console.log(`  - Thumbnail attached`);
          }
        } else {
          console.log(`  - Thumbnail not found: ${frontmatter.thumbnail}`);
        }
      }
      
      // Publish the blog
      await publishBlog(documentId);
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
