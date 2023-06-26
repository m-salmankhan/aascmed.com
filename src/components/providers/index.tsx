import {IGatsbyImageData} from "gatsby-plugin-image";
import {ProvidersArchiveHomePageLayout} from "./providers-archive-home-page-layout";
export interface ProviderSummary {
    slug: string
    excerpt: string
    image: IGatsbyImageData
    name: {
        fullName: string
        title?: string
        degreeAbbr: string
    }
}
export {
    ProvidersArchiveHomePageLayout
}