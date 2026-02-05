// Add resolver for frontmatter.thumbnail to File node for MDX
exports.createSchemaCustomization = ({ actions }) => {
  actions.createTypes(`
    type MdxFrontmatter {
      thumbnail: File @fileByRelativePath
    }
  `);
};
const path = require(`node:path`);
const { createFilePath } = require(`gatsby-source-filesystem`);
const moment = require(`moment`);

const basePath = `content`;
const contentDir = `${__dirname}/${basePath}`;

function addSlug(node, actions, getNode, basePath) {
    actions.createNodeField({
        node,
        name: `slug`,
        value: createFilePath({ node, getNode, basePath }),
    });
}

function addType(type, node, actions, getNode, basePath) {
    actions.createNodeField({
        node,
        name: `post-type`,
        value: type,
    });
}

// if the slug starts
function buildCustomSlug(slug, prefix) {
    if (slug.charAt(0) === '/') {
        return prefix + slug.substring(1);
    }
    return prefix + slug;
}

exports.onCreateNode = ({ node, actions, getNode }) => {
    if (node.internal.type === `Mdx`) {
        const fileDir = path.dirname(path.relative(contentDir, node.internal.contentFilePath));
        const isProvider = (fileDir === `providers`);
        const isCondition = (fileDir === `conditions`);
        const isServiceUpdate = (fileDir === `service-updates`);
        const isReview = (fileDir === `reviews`);
        const isClinic = (fileDir === `clinics`);
        const isBlogPost = (fileDir === `blog`);

        const params = [node, actions, getNode];

        if (isProvider) {
            addSlug(...params)
            addType(`providers`, ...params);
        } else if (isCondition) {
            if (!node.frontmatter.slug) {
                addSlug(...params)
            } else {
                actions.createNodeField({
                    node,
                    name: `slug`,
                    value: buildCustomSlug(node.frontmatter.slug, "/conditions/"),
                });
            }
            addType(`conditions`, ...params);
        } else if (isReview) {
            addType(`review`, ...params);
        } else if (isClinic) {
            addSlug(...params)
            addType(`clinics`, ...params);
        } else if (isServiceUpdate) {
            const date = moment(node.frontmatter.date);
            const filePath = createFilePath({ node, getNode, basePath }).split('/');

            filePath.splice(2, 0, date.format('YYYY'), date.format('MM'));
            const slug = filePath.join('/');

            actions.createNodeField({
                node,
                name: `slug`,
                value: slug,
            });

            addType(`service-update`, ...params);
        } else if (isBlogPost) {
            const date = moment(node.frontmatter.date);
            // if a slug isn't explicitly specified, use the date + filename
            if (!node.frontmatter.slug) {
                const filePath = createFilePath({ node, getNode, basePath }).split('/');
                filePath.splice(2, 0, date.format('YYYY'), date.format('MM'));
                const slug = filePath.join('/');

                actions.createNodeField({
                    node,
                    name: `slug`,
                    value: slug,
                });
            } else {
                actions.createNodeField({
                    node,
                    name: `slug`,
                    value: buildCustomSlug(node.frontmatter.slug, "/blog/"),
                });
            }
            addType(`blog-post`, ...params);
        }
    }
}

exports.createPages = async ({ graphql, actions, reporter }) => {
    const { createPage } = actions;

    const result = await graphql(`
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
            title
            clinic_name
            description
            hours {
              day
              open
              opening_hours {
                start_time
                end_time
              }
              shot_hours {
                start_time
                end_time
              }
            }
            contact {
              phone
              fax
            }
            location {
              address
              lat
              long
              placeId
              label_name
            }
          }
        }
      }
    `);

    if (result.errors) {
        reporter.panicOnBuild('🚨  ERROR: Loading "createPages" query')
    }
    const strapiProviders = result.data.strapiProviders.nodes;
    const strapiServiceUpdates = result.data.strapiServiceUpdates.nodes;
    const clinics = result.data.clinics.nodes;
    const strapiBlogPosts = result.data.strapiBlogPosts.nodes;
    const strapiConditions = result.data.strapiConditions.nodes;

    // Create pages from Strapi conditions
    strapiConditions.forEach((node) => {
        createPage({
            path: `/conditions/${node.slug}/`,
            component: path.resolve(`./src/templates/condition.tsx`),
            context: {
                id: node.id,
                template: 'condition',
            }
        });
    });

    // Create pages from Strapi providers
    strapiProviders.forEach((node) => {
        createPage({
            path: `/providers/${node.slug}/`,
            component: path.resolve(`./src/templates/provider.tsx`),
            context: {
                id: node.id,
                template: 'provider',
            }
        });
    });

    // Create pages from Strapi service updates
    strapiServiceUpdates.forEach((node) => {
        const date = moment(node.date);
        const slug = `/service-updates/${date.format('YYYY')}/${date.format('MM')}/${node.slug}/`;
        createPage({
            path: slug,
            component: path.resolve(`./src/templates/service-update.tsx`),
            context: {
                id: node.id,
                template: 'service-update',
            }
        });
    });


    clinics.forEach((node) => {
        // Generate slug from clinic_name (e.g., "Aurora" -> "/clinics/aurora/")
        const slug = `/clinics/${node.clinic_name.toLowerCase().replace(/\s+/g, '-')}/`;
        createPage({
            path: slug,
            component: path.resolve(`./src/templates/clinic.tsx`),
            context: {
                id: node.id,
                template: 'clinic',
            }
        });
    });

    strapiBlogPosts.forEach((node) => {
        createPage({
            path: `/blog/${node.slug}/`,
            component: path.resolve(`./src/templates/blog-post.tsx`),
            context: {
                id: node.id,
                template: 'blog-post',
            }
        });
    });
}

