// Define optional Strapi types for fields that may not have data
exports.createSchemaCustomization = ({ actions, schema }) => {
  actions.createTypes([
    schema.buildObjectType({
      name: 'STRAPI_TRACKING_INFO',
      interfaces: ['Node'],
      fields: {
        googleAnalyticsId: 'String',
        googleTagManagerId: 'String',
        pixelId: 'String',
      },
    }),
  ]);
};

const path = require(`node:path`);
const moment = require(`moment`);

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

