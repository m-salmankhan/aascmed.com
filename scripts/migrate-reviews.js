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

const reviewsDir = path.join(__dirname, '../content/reviews-archive');

// Convert plain text body to Strapi blocks format
function textToBlocks(text) {
  const blocks = [];
  const paragraphs = text.split(/\n\n+/);
  
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    
    // Handle single newlines within a paragraph (join them)
    const cleanedText = trimmed.replace(/\n/g, ' ');
    
    blocks.push({
      type: 'paragraph',
      children: [{ type: 'text', text: cleanedText }]
    });
  }
  
  return blocks;
}

// Check if review already exists in Strapi
async function reviewExists(name) {
  const encodedName = encodeURIComponent(name);
  const response = await fetch(
    `${STRAPI_URL}/api/reviews?filters[name][$eq]=${encodedName}`,
    {
      headers: {
        'Authorization': `Bearer ${STRAPI_TOKEN}`
      }
    }
  );
  
  if (!response.ok) {
    return false;
  }
  
  const result = await response.json();
  return result.data && result.data.length > 0;
}

// Create review in Strapi
async function createReview(reviewData) {
  const response = await fetch(`${STRAPI_URL}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ data: reviewData })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create review: ${response.status} - ${error}`);
  }
  
  return response.json();
}

// Publish the review
async function publishReview(documentId) {
  const response = await fetch(`${STRAPI_URL}/api/reviews/${documentId}`, {
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
    throw new Error(`Failed to publish review: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function migrateReviews() {
  console.log('Starting reviews migration...\n');
  
  // Get all review files
  const files = fs.readdirSync(reviewsDir).filter(f => f.endsWith('.mdx'));
  console.log(`Found ${files.length} review files\n`);
  
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const file of files) {
    const filePath = path.join(reviewsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    
    const name = frontmatter.title;
    console.log(`Processing: ${name}`);
    
    try {
      // Check if already exists
      if (await reviewExists(name)) {
        console.log(`  Skipping (already exists)\n`);
        skipCount++;
        continue;
      }
      
      // Convert body to blocks
      const contentBlocks = textToBlocks(body.trim());
      
      // Prepare review data
      const reviewData = {
        name: name,
        stars: frontmatter.stars || 5,
        content: contentBlocks,
        sourceName: frontmatter.source?.name || 'Google Reviews',
        sourceUrl: frontmatter.source?.url || ''
      };
      
      // Create the review
      const result = await createReview(reviewData);
      console.log(`  Created review`);
      
      // Publish the review
      const documentId = result.data.documentId;
      await publishReview(documentId);
      console.log(`  Published\n`);
      
      successCount++;
    } catch (error) {
      console.error(`  Error: ${error.message}\n`);
      errorCount++;
    }
  }
  
  console.log('\n--- Migration Summary ---');
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);
}

migrateReviews().catch(console.error);
