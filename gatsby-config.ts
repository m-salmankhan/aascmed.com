import type { GatsbyConfig } from "gatsby";

require("dotenv").config({
  path: `.env.${process.env.NODE_ENV}`,
});

const config: GatsbyConfig = {
    siteMetadata: {
        title: `Allergy, Asthma and Sinus Centers`,
        siteUrl: `https://www.aascmed.com`,
        twitterHandle: `@DrMaazAllergy`,
    },
    // More easily incorporate content into your pages through automatic TypeScript type generation and better GraphQL IntelliSense.
    // If you use VSCode you can also use the GraphQL plugin
    // Learn more at: https://gatsby.dev/graphql-typegen
    graphqlTypegen: true,
    plugins: [
        "gatsby-plugin-emotion",
        "gatsby-plugin-sitemap",
        "gatsby-plugin-sharp",
        "gatsby-transformer-sharp",
        "gatsby-plugin-image",
        "gatsby-plugin-webpack-bundle-analyser-v2",
        {
            resolve: 'gatsby-source-filesystem',
            options: {
                "name": "assets",
                "path": "./static/assets/"
            },
            __key: "assets"
        },
        {
            resolve: `gatsby-plugin-emotion`,
        },
        {
            resolve: `gatsby-omni-font-loader`,
            options: {
                enableListener: true,
                preconnect: [`https://fonts.googleapis.com`, `https://fonts.gstatic.com`],
                web: [
                    {
                        name: `Poppins`,
                        file: `https://fonts.googleapis.com/css2?family=Poppins:wght@300;800&display=swap`,
                    },
                ],
            },
        },
        {
            resolve: `gatsby-source-strapi`,
            options: {
                apiURL: process.env.GATSBY_STRAPI_API_URL || 'http://localhost:1337',
                accessToken: process.env.STRAPI_TOKEN,
                publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                collectionTypes: [
                    {
                        singularName: 'blog',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: "*"
                        }
                    },
                    {
                        singularName: 'clinic',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: {
                                hours: {
                                    populate: ['opening_hours', 'shot_hours']
                                },
                                location: "*",
                                contact: "*",
                            }
                        }
                    },
                    {
                        singularName: 'condition',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: ['thumbnail', 'content', 'content.questions', 'content.text']
                        }
                    },
                    {
                        singularName: 'provider',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: ['image', 'name', 'body', 'body.text', 'review', 'retirementNotice']
                        }
                    },
                    {
                        singularName: 'service-update',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'review',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    }
                ],
                singleTypes: [
                    {
                        singularName: 'announcement',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'blog-archive',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'conditions-archive',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'clinics-archive',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'contact',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'providers-page',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'service-update-page',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'privacy-policy',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'home-page',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: {
                                hero: { populate: '*' },
                                conditions: { populate: '*' },
                                serviceUpdates: { populate: '*' },
                                blog: { populate: '*' },
                                providers: { populate: '*' },
                                feedback: { populate: '*' },
                                locations: { populate: '*' },
                                contact: { populate: '*' }
                            }
                        }
                    },
                    {
                        singularName: 'tracking-info',
                        queryParams: {
                            publicationState: process.env.GATSBY_IS_PREVIEW === "true" ? "preview" : "live",
                            populate: '*'
                        }
                    }
                ],
                queryLimit: 1000,
                skipContentTypeCheck: true,
            },
        },
    ]
};

export default config;
