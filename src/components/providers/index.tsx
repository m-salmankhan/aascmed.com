import {ProvidersArchiveHomePageLayout} from "./providers-archive-home-page-layout";
import {ProviderArchive} from "./providers-archive";
export interface ProviderSummary {
    slug: string
    excerpt?: string
    image?: React.ReactNode
    name: {
        fullName: string
        title?: string
        degreeAbbr?: string
        degree?: string
    }
    retired: boolean
}
export {
    ProvidersArchiveHomePageLayout,
    ProviderArchive
}