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
        "gatsby-plugin-static-cms",
        "gatsby-plugin-emotion",
        "gatsby-plugin-sitemap",
        "gatsby-plugin-sharp",
        "gatsby-transformer-sharp",
        "gatsby-plugin-image",
        `gatsby-transformer-yaml`,
        "gatsby-plugin-webpack-bundle-analyser-v2",
        {
            resolve: 'gatsby-source-filesystem',
            options: {
                "name": "assets",
                "path": "./static/assets/"
            },
            __key: "assets"
        }, {
            resolve: 'gatsby-source-filesystem',
            options: {
                "name": "pages",
                "path": "./src/pages/"
            },
            __key: "pages"
        }, {
            resolve: 'gatsby-source-filesystem',
            options: {
                "name": "content",
                "path": "./content/"
            },
            __key: "content"
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
                        file: `https://fonts.googleapis.com/css2?family=Poppins:wght@300;700&display=swap`,
                    },
                ],
            },
        },
        {
            resolve: `gatsby-plugin-mdx`,
            options: {
                gatsbyRemarkPlugins: [
                    {
                        resolve: `gatsby-remark-images`,
                        options: {
                            maxWidth: 1500,
                        },
                    },
                    {
                        resolve: `gatsby-remark-autolink-headers`,
                        options: {
                            elements: [`h1`, `h2`, `h3`],
                            isIconAfterHeader: false,
                            className: `link-icon`
                        },
                    }
                ],
            },
        },
        {
            resolve: `gatsby-source-strapi`,
            options: {
                apiURL: process.env.GATSBY_STRAPI_API_URL || 'http://localhost:1337',
                accessToken: process.env.STRAPI_TOKEN,
                collectionTypes: [
                    {
                        singularName: 'blog',
                        queryParams: {
                            populate: "*"
                        }
                    },
                    {
                        singularName: 'clinic',
                        queryParams: {
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
                            populate: ['thumbnail', 'content', 'content.questions', 'content.text']
                        }
                    },
                    {
                        singularName: 'provider',
                        queryParams: {
                            populate: ['image', 'name', 'body', 'body.text', 'review', 'retirementNotice']
                        }
                    },
                    {
                        singularName: 'service-update',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'review',
                        queryParams: {
                            populate: '*'
                        }
                    }
                ],
                singleTypes: [
                    {
                        singularName: 'announcement',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'blog-archive',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'conditions-archive',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'clinics-archive',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'contact',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'providers-page',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'service-update-page',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'privacy-policy',
                        queryParams: {
                            populate: '*'
                        }
                    },
                    {
                        singularName: 'home-page',
                        queryParams: {
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
