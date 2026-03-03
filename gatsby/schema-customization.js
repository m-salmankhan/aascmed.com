/**
 * Schema Customization
 * 
 * Define optional Strapi types for fields that may not have data.
 * This prevents GraphQL errors when optional fields are missing in draft content.
 * All fields are made optional to support draft content where required fields may be missing.
 */

const createSchemaCustomization = ({ actions, schema }) => {
  const { createTypes } = actions;

  // Node types (using buildObjectType for Node interface)
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
  ]);

  // Component types must implement Node because gatsby-source-strapi creates
  // actual Gatsby nodes for components (with id, internal, children, parent).
  // Gatsby checks the data store and panics if a type has nodes but doesn't
  // implement Node. These declarations ensure component fields exist even when
  // no data has them (e.g. all reviews deleted), preventing GraphQL errors.
  createTypes([
    // Provider components
    buildProviderNameType(schema),
    buildProviderReviewType(schema),
    buildProviderRetirementType(schema),
    // Clinic components
    buildClinicMapType(schema),
    buildClinicContactInfoType(schema),
    buildClinicOpeningHoursType(schema),
    buildClinicTimeRangeType(schema),
    // Generic components
    buildGenericQuestionType(schema),
    buildGenericFaqType(schema),
    buildGenericContactBookingCtaType(schema),
    buildGenericRichTextType(schema),
    buildGenericFaqContactBookButtonsType(schema),
    // Homepage components
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
      hero: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
        extensions: { link: { from: 'hero___NODE' } },
      },
      conditions: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
        extensions: { link: { from: 'conditions___NODE' } },
      },
      serviceUpdates: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
        extensions: { link: { from: 'serviceUpdates___NODE' } },
      },
      blog: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
        extensions: { link: { from: 'blog___NODE' } },
      },
      providers: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
        extensions: { link: { from: 'providers___NODE' } },
      },
      feedback: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_FEEDBACK',
        extensions: { link: { from: 'feedback___NODE' } },
      },
      locations: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
        extensions: { link: { from: 'locations___NODE' } },
      },
      contact: {
        type: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
        extensions: { link: { from: 'contact___NODE' } },
      },
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
      location: {
        type: 'STRAPI__COMPONENT_CLINICS_MAP',
        extensions: { link: { from: 'location___NODE' } },
      },
      contact: {
        type: 'STRAPI__COMPONENT_CLINICS_CONTACT_INFO',
        extensions: { link: { from: 'contact___NODE' } },
      },
      hours: {
        type: '[STRAPI__COMPONENT_CLINICS_OPENING_HOURS]',
        extensions: { link: { from: 'hours___NODE' } },
      },
      body: 'String',
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
      name: {
        type: 'STRAPI__COMPONENT_PROVIDERS_NAME',
        extensions: { link: { from: 'name___NODE' } },
      },
      slug: 'String',
      description: 'String',
      order: 'Int',
      review: {
        type: 'STRAPI__COMPONENT_PROVIDERS_REVIEW',
        extensions: { link: { from: 'review___NODE' } },
      },
      retirementNotice: {
        type: 'STRAPI__COMPONENT_PROVIDERS_RETIREMENT',
        extensions: { link: { from: 'retirementNotice___NODE' } },
      },
      body: 'String',
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
      text: 'String',
    },
  });
}

// ====================
// COMPONENT TYPES
// ====================
// gatsby-source-strapi creates full Gatsby nodes for Strapi components
// (with id, parent, children, internal), so they MUST implement Node.
// Declaring them here ensures the types exist even when no data has the
// component, making the frontend resilient to missing draft content.

/**
 * Provider name component
 */
function buildProviderNameType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_PROVIDERS_NAME',
    interfaces: ['Node'],
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
    interfaces: ['Node'],
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
    interfaces: ['Node'],
    fields: {
      retired: 'Boolean',
      text: 'String',
    },
  });
}

/**
 * Clinic map component
 */
function buildClinicMapType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_CLINICS_MAP',
    interfaces: ['Node'],
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
    interfaces: ['Node'],
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
    interfaces: ['Node'],
    fields: {
      day: 'String',
      open: 'Boolean',
      opening_hours: {
        type: 'STRAPI__COMPONENT_CLINICS_TIME_RANGE',
        extensions: { link: { from: 'opening_hours___NODE' } },
      },
      shot_hours: {
        type: 'STRAPI__COMPONENT_CLINICS_TIME_RANGE',
        extensions: { link: { from: 'shot_hours___NODE' } },
      },
    },
  });
}

/**
 * Clinic time range component
 */
function buildClinicTimeRangeType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_CLINICS_TIME_RANGE',
    interfaces: ['Node'],
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
    interfaces: ['Node'],
    fields: {
      question: 'String',
      answer: 'String',
    },
  });
}

/**
 * Generic FAQ component
 */
function buildGenericFaqType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_FAQ',
    interfaces: ['Node'],
    fields: {
      questions: {
        type: '[STRAPI__COMPONENT_GENERIC_QUESTION]',
        extensions: { link: { from: 'questions___NODE' } },
      },
    },
  });
}

/**
 * Generic contact booking CTA component (no Strapi attributes)
 */
function buildGenericContactBookingCtaType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_CONTACT_BOOKING_CTA',
    interfaces: ['Node'],
    fields: {
      strapi_id: 'Int',
    },
  });
}

/**
 * Generic rich text component
 */
function buildGenericRichTextType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_RICH_TEXT',
    interfaces: ['Node'],
    fields: {
      text: 'String',
    },
  });
}

/**
 * Generic FAQ contact book buttons component (no Strapi attributes)
 */
function buildGenericFaqContactBookButtonsType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_GENERIC_FAQ_CONTACT_BOOK_BUTTONS',
    interfaces: ['Node'],
    fields: {
      strapi_id: 'Int',
    },
  });
}

/**
 * Homepage section component
 */
function buildHomepageSectionType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_HOMEPAGE_CONDITIONS_SECTION',
    interfaces: ['Node'],
    fields: {
      heading: 'String',
      text: 'String',
    },
  });
}

/**
 * Homepage feedback component
 */
function buildHomepageFeedbackType(schema) {
  return schema.buildObjectType({
    name: 'STRAPI__COMPONENT_HOMEPAGE_FEEDBACK',
    interfaces: ['Node'],
    fields: {
      rating: 'Float',
      sourceName: 'String',
      sourceUrl: 'String',
      accessDate: 'String',
    },
  });
}

module.exports = { createSchemaCustomization };
