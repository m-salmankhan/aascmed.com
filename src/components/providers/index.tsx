import {IGatsbyImageData} from "gatsby-plugin-image";
import {ProvidersArchiveHomePageLayout} from "./providers-archive-home-page-layout";
import {ProviderArchive} from "./providers-archive";
export interface ProviderSummary {
    slug: string
    excerpt: string
    image: IGatsbyImageData | null
    name: {
        fullName: string
        title?: string
        degreeAbbr?: string
        degree?: string
    }
}
export {
    ProvidersArchiveHomePageLayout,
    ProviderArchive
}