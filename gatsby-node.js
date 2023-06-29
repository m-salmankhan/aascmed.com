const path = require(`node:path`);
const { createFilePath } = require(`gatsby-source-filesystem`);
const moment = require(`moment`);

const basePath = `content`;
const contentDir = `${__dirname}/${basePath}`;

function addSlug(node, actions, getNode, basePath) {
    actions.createNodeField({
        node,
        name: `slug`,
        value: createFilePath({node, getNode, basePath}),
    });
}

function addType(type, node, actions, getNode, basePath) {
    actions.createNodeField({
        node,
        name: `post-type`,
        value: type,
    });
}

exports.onCreateNode = ({node, actions, getNode}) => {
    if(node.internal.type === `Mdx`) {
        const fileDir = path.dirname(path.relative(contentDir, node.internal.contentFilePath));
        const isProvider = (fileDir === `providers`);
        const isCondition = (fileDir === `conditions`);
        const isServiceUpdate = (fileDir === `service-updates`);
        const isReview = (fileDir === `reviews`);
        const isClinic = (fileDir === `clinics`);

        const params = [node, actions, getNode];

        if(isProvider) {
            addSlug(...params)
            addType(`providers`, ...params);
        } else if(isCondition) {
            addSlug(...params)
            addType(`conditions`, ...params);
        } else if(isReview) {
            addType(`review`, ...params);
        } else if(isClinic) {
            addSlug(...params)
            addType(`clinics`, ...params);
        } else if(isServiceUpdate) {
            const date = moment(node.frontmatter.date);
            const filePath = createFilePath({node, getNode, basePath}).split('/');

            filePath.splice(2, 0, date.format('YYYY'), date.format('MM'));
            const slug = filePath.join('/');

            actions.createNodeField({
                node,
                name: `slug`,
                value: slug,
            });

            addType(`service-update`, ...params);
        }
    }
}

exports.createPages = async ({graphql, actions, reporter}) => {
    const {createPage} = actions;

    const result = await graphql(`
      query {
        conditions: allMdx(filter: {fields: {post_type: {eq: "conditions"}}}) {
          nodes {
            id
            fields {
              slug
            }
            internal {
               contentFilePath
            }
          }
        }
        serviceUpdates: allMdx(filter: {fields: {post_type: {eq: "service-update"}}}) {
          nodes {
            id
            fields {
              slug
            }
            internal {
               contentFilePath
            }
          }
        }
        providers: allMdx(filter: {fields: {post_type: {eq: "providers"}}}) {
          nodes {
            id
            fields {
              slug
            }
            internal {
               contentFilePath
            }
          }
        }
        clinics: allMdx(filter: {fields: {post_type: {eq: "clinics"}}}) {
          nodes {
            id
            fields {
              slug
            }
            internal {
               contentFilePath
            }
          }
        }
      }
    `);

    if(result.errors) {
        reporter.panicOnBuild('🚨  ERROR: Loading "createPages" query')
    }
    const conditions = result.data.conditions.nodes;
    const serviceUpdates = result.data.serviceUpdates.nodes;
    const providers = result.data.providers.nodes;
    const clinics = result.data.clinics.nodes;

    conditions.forEach((node) => {
        console.log(node.internal.contentFilePath)
        createPage({
            path: node.fields.slug,
            component: `${path.resolve(`./src/templates/condition.tsx`)}?__contentFilePath=${node.internal.contentFilePath}`,
            context: {
                id: node.id,
            }
        });
    });

    serviceUpdates.forEach((node) => {
        createPage({
            path: node.fields.slug,
            component: `${path.resolve(`./src/templates/service-update.tsx`)}?__contentFilePath=${node.internal.contentFilePath}`,
            context: {
                id: node.id,
                template: 'service-update',
            }
        });
    });

    providers.forEach((node) => {
        createPage({
            path: node.fields.slug,
            component: `${path.resolve(`./src/templates/provider.tsx`)}?__contentFilePath=${node.internal.contentFilePath}`,
            context: {
                id: node.id,
                template: 'provider',
            }
        });
    });

}

