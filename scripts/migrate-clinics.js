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

const clinicsDir = path.join(__dirname, '../content/clinics');

// Parse time string like "09:00 - 17:00" or "09:00-17:00" into start and end times
function parseTimeRange(hoursStr) {
  if (!hoursStr || hoursStr.toLowerCase() === 'closed') {
    return null;
  }
  
  // Normalize the string - remove spaces around hyphen
  const normalized = hoursStr.replace(/\s*-\s*/g, '-');
  const [start, end] = normalized.split('-');
  
  if (!start || !end) {
    return null;
  }
  
  // Ensure times are in HH:MM:SS format for Strapi
  const formatTime = (t) => {
    const trimmed = t.trim();
    if (trimmed.includes(':')) {
      const parts = trimmed.split(':');
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    return `${trimmed.padStart(2, '0')}:00:00`;
  };
  
  return {
    start_time: formatTime(start),
    end_time: formatTime(end)
  };
}

// Convert markdown body to Strapi blocks format
function markdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  let currentParagraph = [];
  
  for (const line of lines) {
    // Heading
    if (line.startsWith('## ')) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        blocks.push({
          type: 'paragraph',
          children: [{ type: 'text', text: currentParagraph.join(' ') }]
        });
        currentParagraph = [];
      }
      
      // Remove markdown formatting from heading
      const headingText = line.replace(/^## /, '').replace(/\*\*/g, '');
      blocks.push({
        type: 'heading',
        level: 2,
        children: [{ type: 'text', text: headingText }]
      });
    }
    // List item
    else if (line.startsWith('- ')) {
      // Flush current paragraph
      if (currentParagraph.length > 0) {
        blocks.push({
          type: 'paragraph',
          children: [{ type: 'text', text: currentParagraph.join(' ') }]
        });
        currentParagraph = [];
      }
      
      // Get existing list or create new one
      const lastBlock = blocks[blocks.length - 1];
      const listItemText = line.replace(/^- /, '').replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      
      if (lastBlock && lastBlock.type === 'list') {
        lastBlock.children.push({
          type: 'list-item',
          children: [{ type: 'text', text: listItemText }]
        });
      } else {
        blocks.push({
          type: 'list',
          format: 'unordered',
          children: [{
            type: 'list-item',
            children: [{ type: 'text', text: listItemText }]
          }]
        });
      }
    }
    // Empty line
    else if (line.trim() === '') {
      if (currentParagraph.length > 0) {
        blocks.push({
          type: 'paragraph',
          children: [{ type: 'text', text: currentParagraph.join(' ') }]
        });
        currentParagraph = [];
      }
    }
    // Regular text
    else {
      // Strip markdown links and bold
      const cleanedLine = line.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      currentParagraph.push(cleanedLine);
    }
  }
  
  // Flush remaining paragraph
  if (currentParagraph.length > 0) {
    blocks.push({
      type: 'paragraph',
      children: [{ type: 'text', text: currentParagraph.join(' ') }]
    });
  }
  
  return blocks;
}

// Convert MDX clinic data to Strapi format
function convertClinicToStrapi(frontmatter, content) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Build hours array
  const hours = days.map(day => {
    const openingEntry = frontmatter.opening?.find(o => o.day === day);
    const shotEntry = frontmatter.shot?.find(s => s.day === day);
    
    const isOpen = openingEntry && openingEntry.hours && openingEntry.hours.toLowerCase() !== 'closed';
    const openingHours = isOpen ? parseTimeRange(openingEntry.hours) : null;
    const shotHours = shotEntry ? parseTimeRange(shotEntry.hours) : null;
    
    return {
      day,
      open: isOpen,
      opening_hours: openingHours,
      shot_hours: shotHours
    };
  });
  
  return {
    title: frontmatter.page_title,
    clinic_name: frontmatter.clinic_name,
    description: frontmatter.description,
    location: {
      lat: frontmatter.lat,
      long: frontmatter.lon,
      label_name: frontmatter.clinic_name,
      address: frontmatter.address,
      placeId: frontmatter.placeId
    },
    contact: {
      phone: frontmatter.phone,
      fax: frontmatter.fax
    },
    hours,
    body: markdownToBlocks(content)
  };
}

async function createClinic(clinicData) {
  const response = await fetch(`${STRAPI_URL}/api/clinics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${STRAPI_TOKEN}`
    },
    body: JSON.stringify({ data: clinicData })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create clinic: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function publishClinic(id) {
  const response = await fetch(`${STRAPI_URL}/api/clinics/${id}`, {
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
    throw new Error(`Failed to publish clinic: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function main() {
  const files = fs.readdirSync(clinicsDir).filter(f => f.endsWith('.mdx'));
  
  console.log(`Found ${files.length} clinic files to migrate\n`);
  
  for (const file of files) {
    const filePath = path.join(clinicsDir, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);
    
    console.log(`Processing: ${frontmatter.clinic_name}`);
    
    try {
      const strapiData = convertClinicToStrapi(frontmatter, content);
      console.log(`  - Converted to Strapi format`);
      
      const result = await createClinic(strapiData);
      console.log(`  - Created in Strapi (ID: ${result.data.id})`);
      
      // Publish the clinic
      await publishClinic(result.data.documentId);
      console.log(`  - Published`);
      
      console.log(`  ✓ Done\n`);
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}\n`);
    }
  }
  
  console.log('Migration complete!');
}

main().catch(console.error);
