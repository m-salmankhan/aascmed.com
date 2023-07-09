import type { GatsbyConfig } from "gatsby";

const config: GatsbyConfig = {
    siteMetadata: {
        title: `Allergy, Asthma and Sinus Centers`,
        siteUrl: `https://new.aascmed.com`,
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
                            elements: [`h1`, `h2`],
                            isIconAfterHeader: false,
                            className: `link-icon`
                        },
                    }
                ],
            },
        },
    ]
};

export default config;
