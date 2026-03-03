/**
 * Schema Customization
 * 
 * Define optional Strapi types for fields that may not have data.
 * This prevents GraphQL errors when optional fields are missing in draft content.
 * All fields are made optional to support draft content where required fields may be missing.
 */

const createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions;

  createTypes([
    // Single Types
    buildTrackingInfoType(schema),
    buildAnnouncementType(schema),
    buildHomePageType(schema),
    buildPrivacyPolicyType(schema),
    buildBlogArchiveType(schema),
    buildClinicsArchiveType(schema),
    buildConditionsArchiveType(schema),
    buildProvidersPageType(schema),
    buildServiceUpdatePageType(schema),
    buildContactPageType(schema),
    
    // Collection Types
    buildBlogType(schema),
    buildClinicType(schema),
    buildConditionType(schema),
    buildProviderType(schema),
    buildServiceUpdateType(schema),
    buildReviewType(schema),
    
    // Components
    buildProviderNameType(schema),
    buildProviderReviewType(schema),
    buildProviderRetirementType(schema),
    buildClinicMapType(schema),
    buildClinicContactInfoType(schema),
    buildClinicOpeningHoursType(schema),
    buildClinicTimeRangeType(schema),
    buildGenericQuestionType(schema),
    buildGenericFaqType(schema),
    buildGenericContactBookingCtaType(schema),
    buildGenericRichTextType(schema),
    buildGenericFaqContactBookButtonsType(schema),
    buildHomepageSectionType(schema),
    buildHomepageFeedbackType(schema),
  ]);
};

// ====================
// SINGLE TYPES
// ====================

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
      message: 'String', // blocks field simplified to string
      internal: 'Internal',
    },
  });
}

/**
 * Home page type
 */
function buildHomePageType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_HOME_PAGE',
    interfaces: ['Node'],
    fields: {
      metaDescription: 'String',
      hero: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
      conditions: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
      serviceUpdates: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
      blog: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
      providers: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
      feedback: 'STRAPI__COMPONENT_HOMEPAGE_FEEDBACK',
      locations: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
      contact: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
    },
  });
}

/**
 * Privacy policy type
 */
function buildPrivacyPolicyType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_PRIVACY_POLICY',
    interfaces: ['Node'],
    fields: {
      title: 'String',
      description: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

// ====================
// COLLECTION TYPES
// ====================

/**
 * Blog type
 */
function buildBlogType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_BLOG',
    interfaces: ['Node'],
    fields: {
      title: 'String',
      heading: 'String',
      slug: 'String',
      description: 'String',
      date: {
        type: 'Date',
        extensions: {
          dateformat: {},
        },
      },
      content: 'String', // dynamiczone simplified to string
    },
  });
}

/**
 * Clinic type
 */
function buildClinicType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_CLINIC',
    interfaces: ['Node'],
    fields: {
      title: 'String',
      clinic_name: 'String',
      slug: 'String',
      description: 'String',
      location: 'STRAPI__COMPONENT_CLINICS_MAP',
      contact: 'STRAPI__COMPONENT_CLINICS_CONTACT_INFO',
      hours: '[STRAPI__COMPONENT_CLINICS_OPENING_HOURS]',
      body: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Condition type
 */
function buildConditionType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_CONDITION',
    interfaces: ['Node'],
    fields: {
      slug: 'String',
      heading: 'String',
      title: 'String',
      order: 'Int',
      description: 'String',
      content: 'String', // dynamiczone simplified to string
    },
  });
}

/**
 * Provider type with optional fields
 */
function buildProviderType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_PROVIDER',
    interfaces: ['Node'],
    fields: {
      name: 'STRAPI__COMPONENT_PROVIDERS_NAME',
      slug: 'String',
      description: 'String',
      order: 'Int',
      review: 'STRAPI__COMPONENT_PROVIDERS_REVIEW',
      retirementNotice: 'STRAPI__COMPONENT_PROVIDERS_RETIREMENT',
      body: 'String', // dynamiczone simplified to string
    },
  });
}

/**
 * Service update type
 */
function buildServiceUpdateType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_SERVICE_UPDATE',
    interfaces: ['Node'],
    fields: {
      title: 'String',
      date: {
        type: 'Date',
        extensions: {
          dateformat: {},
        },
      },
      slug: 'String',
      description: 'String',
      body: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Review type
 */
function buildReviewType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_REVIEW',
    interfaces: ['Node'],
    fields: {
      name: 'String',
      stars: 'Float',
      content: 'String', // blocks field simplified to string
      sourceName: 'String',
      sourceUrl: 'String',
    },
  });
}

// ====================
// COMPONENT TYPES
// ====================

/**
 * Provider name component
 */
function buildProviderNameType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_PROVIDERS_NAME',
    extensions: {
      dontInfer: {},
    },
    fields: {
      fullName: 'String',
      honorific: 'String',
      qualificationLong: 'String',
      qualificationAbbr: 'String',
    },
  });
}

/**
 * Provider review component
 */
function buildProviderReviewType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_PROVIDERS_REVIEW',
    extensions: {
      dontInfer: {},
    },
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
 * Provider retirement component
 */
function buildProviderRetirementType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_PROVIDERS_RETIREMENT',
    extensions: {
      dontInfer: {},
    },
    fields: {
      retired: 'Boolean',
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Clinic map component
 */
function buildClinicMapType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_CLINICS_MAP',
    extensions: {
      dontInfer: {},
    },
    fields: {
      lat: 'Float',
      long: 'Float',
      label_name: 'String',
      address: 'String',
      placeId: 'String',
    },
  });
}

/**
 * Clinic contact info component
 */
function buildClinicContactInfoType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_CLINICS_CONTACT_INFO',
    extensions: {
      dontInfer: {},
    },
    fields: {
      phone: 'String',
      fax: 'String',
    },
  });
}

/**
 * Clinic opening hours component
 */
function buildClinicOpeningHoursType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_CLINICS_OPENING_HOURS',
    extensions: {
      dontInfer: {},
    },
    fields: {
      day: 'String',
      open: 'Boolean',
      opening_hours: 'STRAPI__COMPONENT_CLINICS_TIME_RANGE',
      shot_hours: 'STRAPI__COMPONENT_CLINICS_TIME_RANGE',
    },
  });
}

/**
 * Clinic time range component
 */
function buildClinicTimeRangeType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_CLINICS_TIME_RANGE',
    extensions: {
      dontInfer: {},
    },
    fields: {
      start_time: 'String',
      end_time: 'String',
    },
  });
}

/**
 * Generic question component
 */
function buildGenericQuestionType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_QUESTION',
    extensions: {
      dontInfer: {},
    },
    fields: {
      question: 'String',
      answer: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Generic FAQ component
 */
function buildGenericFaqType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_FAQ',
    extensions: {
      dontInfer: {},
    },
    fields: {
      questions: '[STRAPI__COMPONENT_GENERIC_QUESTION]',
    },
  });
}

/**
 * Generic contact booking CTA component
 */
function buildGenericContactBookingCtaType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_CONTACT_BOOKING_CTA',
    extensions: {
      dontInfer: {},
    },
    fields: {
      // Placeholder field since this component has no attributes in Strapi schema
      _placeholder: 'String',
    },
  });
}

/**
 * Generic rich text component
 */
function buildGenericRichTextType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_RICH_TEXT',
    extensions: {
      dontInfer: {},
    },
    fields: {
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Generic FAQ contact book buttons component
 */
function buildGenericFaqContactBookButtonsType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_FAQ_CONTACT_BOOK_BUTTONS',
    extensions: {
      dontInfer: {},
    },
    fields: {
      // Placeholder field since this component has no attributes in Strapi schema
      _placeholder: 'String',
    },
  });
}

/**
 * Homepage section component
 */
function buildHomepageSectionType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
    extensions: {
      dontInfer: {},
    },
    fields: {
      heading: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Homepage feedback component
 */
function buildHomepageFeedbackType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_HOMEPAGE_FEEDBACK',
    extensions: {
      dontInfer: {},
    },
    fields: {
      rating: 'Float',
      sourceName: 'String',
      sourceUrl: 'String',
      accessDate: 'String',
    },
  });
}

// ====================
// ARCHIVE & PAGE TYPES
// ====================

/**
 * Blog archive page type
 */
function buildBlogArchiveType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_BLOG_ARCHIVE',
    interfaces: ['Node'],
    fields: {
      heading: 'String',
      metaDescription: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Clinics archive page type
 */
function buildClinicsArchiveType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_CLINICS_ARCHIVE',
    interfaces: ['Node'],
    fields: {
      heading: 'String',
      metaDescription: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Conditions archive page type
 */
function buildConditionsArchiveType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_CONDITIONS_ARCHIVE',
    interfaces: ['Node'],
    fields: {
      heading: 'String',
      metaDescription: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Providers page type
 */
function buildProvidersPageType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_PROVIDERS_PAGE',
    interfaces: ['Node'],
    fields: {
      heading: 'String',
      metaDescription: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Service update page type
 */
function buildServiceUpdatePageType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_SERVICE_UPDATE_PAGE',
    interfaces: ['Node'],
    fields: {
      heading: 'String',
      metaDescription: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

/**
 * Contact page type
 */
function buildContactPageType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI_CONTACT',
    interfaces: ['Node'],
    fields: {
      heading: 'String',
      metaDescription: 'String',
      text: 'String', // blocks field simplified to string
    },
  });
}

module.exports = { createSchemaCustomization };
