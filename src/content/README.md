# Content contracts

`models.ts` defines serializable content, blocks, site settings and media descriptors used by React views. CMS responses are validated and mapped by `src/server/content`; credentials and raw SDK data remain server-side. Structured Blocks and dynamic-zone data become React elements only inside views.

`urls.ts` preserves public trailing-slash paths and the clinic-name fallback. Service updates require a valid calendar date and slug; incomplete drafts do not generate malformed URLs. `validation.ts` enforces published record identifiers, titles and routes, while accepting incomplete draft fields.

Collection ordering is selected by the server loaders. Keep stable query ordering and pagination before applying display limits. The local in-memory sort helpers apply to materialized collections only. Content and route contracts are covered by `tests/unit/content-contracts.test.mjs` and the actual static/SSR integration fixtures.
