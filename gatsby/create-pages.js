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
 * @import { Actions, CreatePagesArgs, Reporter } from 'gatsby'
 * @import {
 *   SocialCardKind,
 *   SocialCardResult,
 * } from '../astro/src/lib/public-images.d.mts'
 */
/** Gatsby's page-registration action, derived from its own Actions interface.
 * @typedef {Actions['createPage']} CreatePage
 */
/** Social-card input adapted from one Gatsby query record.
 * @typedef {object} OGImageRequest
 * @property {string} slug Content slug used in the public card path.
 * @property {string} title Text rendered on the card.
 * @property {string} [thumbnailPath] Local background image supplied by Gatsby.
 * @property {SocialCardKind} outputDir Card family used for its output directory.
 */
/** Public URL and cache result returned by the Gatsby adapter.
 * @typedef {Pick<SocialCardResult, 'imagePath' | 'wasCached'>} OGImageResult
 */
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
/** Run Gatsby's page-creation query and dispatch records to their page builders.
 * @param {CreatePagesArgs} context Gatsby hook inputs for querying records, registering pages, and reporting build issues.
 * @returns Promise<void> after every dynamic page has been created.
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
  reporter.info(
    `Created pages: ${data.strapiBlogPosts.nodes.length} blogs, ${data.strapiConditions.nodes.length} conditions, ${data.strapiProviders.nodes.length} providers, ${data.strapiServiceUpdates.nodes.length} service updates, ${data.clinics.nodes.length} clinics`,
  );
}
/** Reuse or create one social card through the shared renderer and private content-aware cache.
 * @param {OGImageRequest} options Record slug, card title, optional local thumbnail, and public card family.
 * @returns {Promise<OGImageResult>} Compatible public image URL and whether the existing output was reused.
 */
async function getOGImage({ slug, title, thumbnailPath, outputDir }) {
  const { buildSocialCards } = await import(
    '../astro/src/lib/public-images.mjs'
  );
  const kind = outputDir === 'conditions' ? 'conditions' : outputDir;
  const [card] = await buildSocialCards(
    [
      {
        kind,
        slug,
        title: title || 'Untitled',
        backgroundImage: thumbnailPath,
        mediaName: thumbnailPath
          ? path.basename(thumbnailPath, path.extname(thumbnailPath))
          : 'default',
      },
    ],
    {
      publicDir: path.resolve('./public'),
      cacheDir: path.resolve('./.cache/public-images'),
    },
  );
  return { imagePath: card.imagePath, wasCached: card.wasCached };
}
/** Create each blog detail page and attach its shared social-card path to Gatsby page context.
 * @param {CreatePage} createPage Gatsby page creation action.
 * @param {Array<Object>} posts Blog nodes returned by PAGE_QUERY.
 * @param {Reporter} reporter Gatsby build reporter for generation counts and recoverable failures.
 * @returns Promise<void> after all blog pages are registered.
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
      reporter.warn(
        `Failed to generate OG image for "${node.slug}": ${error.message}`,
      );
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
  reporter.info(
    `OG images: ${generated} generated, ${cached} cached (${posts.length} total)`,
  );
}
/** Create condition detail pages and attach their shared social-card paths.
 * @param {CreatePage} createPage Gatsby page creation action.
 * @param {Array<Object>} conditions Condition nodes returned by PAGE_QUERY.
 * @param {Reporter} reporter Gatsby build reporter for generation counts and recoverable failures.
 * @returns Promise<void> after all condition pages are registered.
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
      reporter.warn(
        `Failed to generate OG image for condition "${node.slug}": ${error.message}`,
      );
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
  reporter.info(
    `Condition OG images: ${generated} generated, ${cached} cached (${conditions.length} total)`,
  );
}
/** Register provider detail pages using their existing template and content IDs.
 * @param {CreatePage} createPage Gatsby page creation action.
 * @param {Array<Object>} providers Provider nodes returned by PAGE_QUERY.
 * @returns Nothing; pages are registered through `createPage`.
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
/** Register dated service-update pages using each record's stored date and slug.
 * @param {CreatePage} createPage Gatsby page creation action.
 * @param {Array<Object>} updates Service-update nodes returned by PAGE_QUERY.
 * @returns Nothing; pages are registered through `createPage`.
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
/** Create clinic pages and use cached Mapbox imagery as their social-card background.
 * @param {CreatePage} createPage Gatsby page creation action.
 * @param {Array<Object>} clinics Clinic nodes with optional coordinates.
 * @param {Reporter} reporter Gatsby build reporter for generation counts and recoverable failures.
 * @param {string} siteTitle Site title prepended to each clinic name in its card.
 * @returns Promise<void> after every clinic page is registered.
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
    const slug =
      node.slug || node.clinic_name.toLowerCase().replace(/\s+/g, '-');
    const pagePath = `/clinics/${slug}/`;
    // Check if clinic has location data
    const lat = node.location?.lat;
    const lng = node.location?.long;
    let ogImagePath = undefined;
    if (lat && lng) {
      try {
        // Download Mapbox static image as background (cached on disk)
        const mapImagePath = path.join(
          mapCacheDir,
          `${slug}-${lat}-${lng}-map.png`,
        );
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
        reporter.warn(
          `Failed to generate OG image for clinic "${node.clinic_name}": ${error.message}`,
        );
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
  reporter.info(
    `Clinic OG images: ${generated} generated, ${cached} cached (${clinics.length} total)`,
  );
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
