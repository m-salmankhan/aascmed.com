/**
 * Page Creation
 * 
 * Creates dynamic pages from Strapi content types.
 * Each content type has its own creation function for clarity.
 */

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const moment = require('moment');
const { generateOGImage, initOGImageGenerator } = require('./og-image-generator');

/**
 * GraphQL query to fetch all content for page creation
 */
const PAGE_QUERY = `
  query {
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
      }
    }
  }
`;

/**
 * Main createPages function
 */
async function createPages({ graphql, actions, reporter, cache }) {
  const { createPage } = actions;

  const result = await graphql(PAGE_QUERY);

  if (result.errors) {
    reporter.panicOnBuild('🚨 ERROR: Loading "createPages" query');
    return;
  }

  const { data } = result;

  // Initialize OG image generator (downloads fonts, etc.)
  await initOGImageGenerator();

  // Create pages for each content type
  await createBlogPages(createPage, data.strapiBlogPosts.nodes, reporter, cache);
  await createConditionPages(createPage, data.strapiConditions.nodes, reporter, cache);
  createProviderPages(createPage, data.strapiProviders.nodes);
  createServiceUpdatePages(createPage, data.strapiServiceUpdates.nodes);
  createClinicPages(createPage, data.clinics.nodes);

  reporter.info(`Created pages: ${data.strapiBlogPosts.nodes.length} blogs, ${data.strapiConditions.nodes.length} conditions, ${data.strapiProviders.nodes.length} providers, ${data.strapiServiceUpdates.nodes.length} service updates, ${data.clinics.nodes.length} clinics`);
}

/**
 * Generate a hash for cache invalidation based on title and thumbnail
 */
function generateOGImageHash(title, thumbnailPath) {
  const hash = crypto.createHash('md5');
  hash.update(title || '');
  
  if (thumbnailPath && fs.existsSync(thumbnailPath)) {
    const stat = fs.statSync(thumbnailPath);
    hash.update(stat.mtimeMs.toString());
  }
  
  return hash.digest('hex');
}

/**
 * Get or generate an OG image with caching
 * 
 * @param {Object} options
 * @param {string} options.slug - Unique identifier for the image
 * @param {string} options.title - Title text for the image
 * @param {string} options.thumbnailPath - Path to background image (optional)
 * @param {string} options.outputDir - Directory to save the image
 * @param {Object} options.cache - Gatsby cache instance
 * @returns {Promise<{ imagePath: string, wasCached: boolean }>}
 */
async function getOGImage({ slug, title, thumbnailPath, outputDir, cache }) {
  const imagePath = `/og-images/${outputDir}/${slug}.png`;
  const outputPath = path.resolve(`./public/og-images/${outputDir}/${slug}.png`);
  const cacheKey = `og-image-${outputDir}-${slug}`;
  const contentHash = generateOGImageHash(title, thumbnailPath);
  
  // Check cache
  const cachedHash = await cache.get(cacheKey);
  const outputExists = fs.existsSync(outputPath);
  
  if (cachedHash === contentHash && outputExists) {
    return { imagePath, wasCached: true };
  }
  
  // Generate new image
  await generateOGImage({
    title: title || 'Untitled',
    backgroundImagePath: thumbnailPath,
    outputPath,
  });
  
  await cache.set(cacheKey, contentHash);
  return { imagePath, wasCached: false };
}

/**
 * Create blog post pages and generate OG images (with caching)
 */
async function createBlogPages(createPage, posts, reporter, cache) {
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
        cache,
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
async function createConditionPages(createPage, conditions, reporter, cache) {
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
        cache,
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
 * Create clinic pages
 */
function createClinicPages(createPage, clinics) {
  clinics.forEach((node) => {
    // Generate slug from clinic_name (e.g., "Aurora" -> "/clinics/aurora/")
    const slug = `/clinics/${node.clinic_name.toLowerCase().replace(/\s+/g, '-')}/`;
    
    createPage({
      path: slug,
      component: path.resolve('./src/templates/clinic.tsx'),
      context: {
        id: node.id,
        template: 'clinic',
      },
    });
  });
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
