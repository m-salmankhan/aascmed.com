/**
 * Gatsby Node APIs
 * 
 * This file is the entry point for Gatsby's Node APIs.
 * The actual implementation is split into modules in the /gatsby directory.
 * 
 * @see https://www.gatsbyjs.com/docs/reference/config-files/gatsby-node/
 */

const { createSchemaCustomization } = require('./gatsby/schema-customization');
const { createPages } = require('./gatsby/create-pages');

// Export Gatsby Node APIs
exports.createSchemaCustomization = createSchemaCustomization;
exports.createPages = createPages;
