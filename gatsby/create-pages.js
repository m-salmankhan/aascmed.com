/**
 * Page Creation
 * 
 * Creates dynamic pages from Strapi content types.
 * Each content type has its own creation function for clarity.
 */

const path = require('node:path');
const fs = require('node:fs');
const moment = require('moment');
const { downloadMapboxImage } = require('./og-image-generator');

/**
 * GraphQL query to fetch all content for page creation
 */
const PAGE_QUERY = `
  query {
    site {
      siteMetadata {
        title
      }
    }
    strapiBlogPosts: allStrapiBlog {
      nodes {
        id
        slug
        title
        thumbnail {
          localFile {
            absolutePath
          }
        }
      }
    }
    strapiConditions: allStrapiCondition {
      nodes {
        id
        slug
        heading
        thumbnail {
          localFile {
            absolutePath
          }
        }
      }
    }
    strapiProviders: allStrapiProvider {
      nodes {
        id
        slug
      }
    }
    strapiServiceUpdates: allStrapiServiceUpdate {
      nodes {
        id
        slug
        date
      }
    }
    clinics: allStrapiClinic {
      nodes {
        id
        clinic_name
        slug
        location {
          lat
          long
        }
      }
    }
  }
`;

/**
 * Main createPages function
 */
async function createPages({ graphql, actions, reporter }) {
  const { createPage } = actions;

  const result = await graphql(PAGE_QUERY);

  if (result.errors) {
    reporter.panicOnBuild('🚨 ERROR: Loading "createPages" query');
    return;
  }

  const { data } = result;
  const siteTitle = data.site.siteMetadata.title;

  // Create pages for each content type
  await createBlogPages(createPage, data.strapiBlogPosts.nodes, reporter);
  await createConditionPages(createPage, data.strapiConditions.nodes, reporter);
  createProviderPages(createPage, data.strapiProviders.nodes);
  createServiceUpdatePages(createPage, data.strapiServiceUpdates.nodes);
  await createClinicPages(createPage, data.clinics.nodes, reporter, siteTitle);

  reporter.info(`Created pages: ${data.strapiBlogPosts.nodes.length} blogs, ${data.strapiConditions.nodes.length} conditions, ${data.strapiProviders.nodes.length} providers, ${data.strapiServiceUpdates.nodes.length} service updates, ${data.clinics.nodes.length} clinics`);
}

/**
 * Get or generate an OG image with caching
 * 
 * @param {Object} options
 * @param {string} options.slug - Unique identifier for the image
 * @param {string} options.title - Title text for the image
 * @param {string} options.thumbnailPath - Path to background image (optional)
 * @param {string} options.outputDir - Directory to save the image
 * @returns {Promise<{ imagePath: string, wasCached: boolean }>}
 */
async function getOGImage({ slug, title, thumbnailPath, outputDir }) {
  const { buildSocialCards } = await import('../astro/src/lib/public-images.ts');
  const kind = outputDir === 'conditions' ? 'conditions' : outputDir;
  const [card] = await buildSocialCards([{
    kind,
    slug,
    title: title || 'Untitled',
    backgroundImage: thumbnailPath,
    mediaName: thumbnailPath ? path.basename(thumbnailPath, path.extname(thumbnailPath)) : 'default',
  }], {
    publicDir: path.resolve('./public'),
    cacheDir: path.resolve('./.cache/public-images'),
  });
  return { imagePath: card.imagePath, wasCached: card.wasCached };
}

/**
 * Create blog post pages and generate OG images (with caching)
 */
async function createBlogPages(createPage, posts, reporter) {
  const blogTemplate = path.resolve('./src/templates/blog-post.tsx');
  
  let generated = 0;
  let cached = 0;
  
  for (const node of posts) {
    try {
      const { imagePath, wasCached } = await getOGImage({
        slug: node.slug,
        title: node.title,
        thumbnailPath: node.thumbnail?.localFile?.absolutePath,
        outputDir: 'blog',
      });
      
      wasCached ? cached++ : generated++;
      
      createPage({
        path: `/blog/${node.slug}/`,
        component: blogTemplate,
        context: {
          id: node.id,
          template: 'blog-post',
          ogImagePath: imagePath,
        },
      });
    } catch (error) {
      reporter.warn(`Failed to generate OG image for "${node.slug}": ${error.message}`);
      
      // Still create the page, just without the OG image
      createPage({
        path: `/blog/${node.slug}/`,
        component: blogTemplate,
        context: {
          id: node.id,
          template: 'blog-post',
        },
      });
    }
  }
  
  reporter.info(`OG images: ${generated} generated, ${cached} cached (${posts.length} total)`);
}

/**
 * Create condition pages and generate OG images (with caching)
 */
async function createConditionPages(createPage, conditions, reporter) {
  const conditionTemplate = path.resolve('./src/templates/condition.tsx');
  
  let generated = 0;
  let cached = 0;
  
  for (const node of conditions) {
    try {
      const { imagePath, wasCached } = await getOGImage({
        slug: node.slug,
        title: node.heading,
        thumbnailPath: node.thumbnail?.localFile?.absolutePath,
        outputDir: 'conditions',
      });
      
      wasCached ? cached++ : generated++;
      
      createPage({
        path: `/conditions/${node.slug}/`,
        component: conditionTemplate,
        context: {
          id: node.id,
          template: 'condition',
          ogImagePath: imagePath,
        },
      });
    } catch (error) {
      reporter.warn(`Failed to generate OG image for condition "${node.slug}": ${error.message}`);
      
      createPage({
        path: `/conditions/${node.slug}/`,
        component: conditionTemplate,
        context: {
          id: node.id,
          template: 'condition',
        },
      });
    }
  }
  
  reporter.info(`Condition OG images: ${generated} generated, ${cached} cached (${conditions.length} total)`);
}

/**
 * Create provider pages
 */
function createProviderPages(createPage, providers) {
  providers.forEach((node) => {
    createPage({
      path: `/providers/${node.slug}/`,
      component: path.resolve('./src/templates/provider.tsx'),
      context: {
        id: node.id,
        template: 'provider',
      },
    });
  });
}

/**
 * Create service update pages with date-based URLs
 */
function createServiceUpdatePages(createPage, updates) {
  updates.forEach((node) => {
    const date = moment(node.date);
    const slug = `/service-updates/${date.format('YYYY')}/${date.format('MM')}/${node.slug}/`;
    
    createPage({
      path: slug,
      component: path.resolve('./src/templates/service-update.tsx'),
      context: {
        id: node.id,
        template: 'service-update',
      },
    });
  });
}

/**
 * Create clinic pages with OG images using Mapbox static maps
 */
async function createClinicPages(createPage, clinics, reporter, siteTitle) {
  const clinicTemplate = path.resolve('./src/templates/clinic.tsx');
  const mapCacheDir = path.resolve('./.cache/mapbox');
  
  // Ensure map cache directory exists
  if (!fs.existsSync(mapCacheDir)) {
    fs.mkdirSync(mapCacheDir, { recursive: true });
  }
  
  let generated = 0;
  let cached = 0;
  
  for (const node of clinics) {
    // Generate slug from clinic_name (e.g., "Aurora" -> "/clinics/aurora/")
    const slug = node.slug || node.clinic_name.toLowerCase().replace(/\s+/g, '-');
    const pagePath = `/clinics/${slug}/`;
    
    // Check if clinic has location data
    const lat = node.location?.lat;
    const lng = node.location?.long;
    
    let ogImagePath = undefined;
    
    if (lat && lng) {
      try {
        // Download Mapbox static image as background (cached on disk)
        const mapImagePath = path.join(mapCacheDir, `${slug}-${lat}-${lng}-map.png`);
        
        if (!fs.existsSync(mapImagePath)) {
          await downloadMapboxImage(lat, lng, mapImagePath);
        }
        
        // Generate OG image with map as background
        const { imagePath, wasCached } = await getOGImage({
          slug,
          title: `${siteTitle} ${node.clinic_name}`,
          thumbnailPath: mapImagePath,
          outputDir: 'clinics',
        });
        
        ogImagePath = imagePath;
        wasCached ? cached++ : generated++;
      } catch (error) {
        reporter.warn(`Failed to generate OG image for clinic "${node.clinic_name}": ${error.message}`);
      }
    }
    
    createPage({
      path: pagePath,
      component: clinicTemplate,
      context: {
        id: node.id,
        template: 'clinic',
        ogImagePath,
      },
    });
  }
  
  reporter.info(`Clinic OG images: ${generated} generated, ${cached} cached (${clinics.length} total)`);
}

module.exports = {
  createPages,
  // Export individual functions for testing or reuse
  createBlogPages,
  createConditionPages,
  createProviderPages,
  createServiceUpdatePages,
  createClinicPages,
};
