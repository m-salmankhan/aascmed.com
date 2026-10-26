# Shared content contracts

`models.ts` is the serializable boundary shared by Gatsby and Astro. Views receive plain content, blocks, site settings, and media descriptors; they do not receive `Queries.*`, Gatsby nodes, `localFile` trees, React elements, or credentials. Strapi Blocks and dynamic-zone data remains structured JSON until a React view renders it.

`gatsby-adapter.ts` is the Gatsby-side adapter. It selects only fields used by shared views, translates Gatsby's snake-case component fields to stable names, converts Gatsby image data to `MediaDescriptor`, and extracts only the requested `body` or `content` arrays from `internal.content`. Malformed or absent optional draft content is omitted. REST adapters should return the same model shape directly from Strapi fields and must never include the server token.

`urls.ts` holds pure detail-path rules. Blog, condition, provider, and clinic paths keep trailing slashes. Clinics use the current lowercase, whitespace-to-hyphen name fallback when no explicit slug exists. Dated service updates retain the `/service-updates/YYYY/MM/slug/` route; records without a date retain Gatsby's current `/service-updates/slug/` fallback. Invalid non-empty dates and missing slugs return `null`, allowing published-data validation or an explicit draft error instead of emitting `/undefined`.

Adapters preserve the ordering selected by their query. Where REST must recreate it, use `sortByOrder` for order-based condition/provider lists and `sortByDateDescending` for blog/update lists; keep existing display limits and homepage retired-provider filtering at the consuming query/view boundary. The captured route reference remains [`tests/ui/routes.json`](../../../tests/ui/routes.json).
