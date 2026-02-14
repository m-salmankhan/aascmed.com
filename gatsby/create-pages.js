/**
 * Page Creation
 * 
 * Creates dynamic pages from Strapi content types.
 * Each content type has its own creation function for clarity.
 */

const path = require('node:path');
const moment = require('moment');

/**
 * GraphQL query to fetch all content for page creation
 */
const PAGE_QUERY = `
  query {
    strapiBlogPosts: allStrapiBlog {
      nodes {
        id
        slug
      }
    }
    strapiConditions: allStrapiCondition {
      nodes {
        id
        slug
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
async function createPages({ graphql, actions, reporter }) {
  const { createPage } = actions;

  const result = await graphql(PAGE_QUERY);

  if (result.errors) {
    reporter.panicOnBuild('🚨 ERROR: Loading "createPages" query');
    return;
  }

  const { data } = result;

  // Create pages for each content type
  createBlogPages(createPage, data.strapiBlogPosts.nodes);
  createConditionPages(createPage, data.strapiConditions.nodes);
  createProviderPages(createPage, data.strapiProviders.nodes);
  createServiceUpdatePages(createPage, data.strapiServiceUpdates.nodes);
  createClinicPages(createPage, data.clinics.nodes);

  reporter.info(`Created pages: ${data.strapiBlogPosts.nodes.length} blogs, ${data.strapiConditions.nodes.length} conditions, ${data.strapiProviders.nodes.length} providers, ${data.strapiServiceUpdates.nodes.length} service updates, ${data.clinics.nodes.length} clinics`);
}

/**
 * Create blog post pages
 */
function createBlogPages(createPage, posts) {
  posts.forEach((node) => {
    createPage({
      path: `/blog/${node.slug}/`,
      component: path.resolve('./src/templates/blog-post.tsx'),
      context: {
        id: node.id,
        template: 'blog-post',
      },
    });
  });
}

/**
 * Create condition pages
 */
function createConditionPages(createPage, conditions) {
  conditions.forEach((node) => {
    createPage({
      path: `/conditions/${node.slug}/`,
      component: path.resolve('./src/templates/condition.tsx'),
      context: {
        id: node.id,
        template: 'condition',
      },
    });
  });
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
