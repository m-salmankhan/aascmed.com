/**
 * Schema Customization
 * 
 * Define optional Strapi types for fields that may not have data.
 * This prevents GraphQL errors when optional fields are missing.
 */

const createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions;

  createTypes([
    buildTrackingInfoType(schema),
    buildAnnouncementType(schema),
    buildProviderReviewType(schema),
    buildProviderType(schema),
  ]);
};

/**
 * Tracking info type for analytics IDs
 */
function buildTrackingInfoType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_TRACKING_INFO',
    interfaces: ['Node'],
    fields: {
      googleAnalyticsId: 'String',
      googleTagManagerId: 'String',
      pixelId: 'String',
    },
  });
}

/**
 * Announcement banner type
 */
function buildAnnouncementType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_ANNOUNCEMENT',
    interfaces: ['Node'],
    fields: {
      enabled: 'Boolean',
      type: 'String',
      internal: 'Internal',
    },
  });
}

/**
 * Optional review component on provider
 */
function buildProviderReviewType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_PROVIDER_REVIEW',
    fields: {
      text: 'String',
      reviewer: 'String',
      date: {
        type: 'Date',
        extensions: {
          dateformat: {},
        },
      },
      link: 'String',
    },
  });
}

/**
 * Provider type with optional review field
 */
function buildProviderType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_PROVIDER',
    interfaces: ['Node'],
    fields: {
      review: 'STRAPI_PROVIDER_REVIEW',
    },
  });
}

module.exports = { createSchemaCustomization };
