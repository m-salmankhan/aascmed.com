# Server-side CMS content

This directory owns Strapi access and normalization. `strapi.ts` configures the official Strapi client and validates responses; `loaders.ts` defines domain queries; `mapping.ts` produces the serializable [content models](../../content/README.md) used by views. `routes.ts` builds compact route manifests. Credentials and raw SDK responses stay on the server.

## Configuration and publication modes

`STRAPI_API_URL` supplies the CMS origin and `STRAPI_TOKEN` is a server-only Content API token. See the [environment inventory](../../../docs/environment-variables.md) for configuration locations and permissions.

Published reads leave caching to the server. Draft reads send `no-store` and require `ASTRO_CONTENT_MODE=draft` on a protected SSR deployment. Static builds reject draft requests. Content mode comes from server configuration, not URL query parameters. The SDK uses its default fetch redirects and 10-second timeout until response headers arrive. Errors are sanitized before reaching callers.

## Loaders

Collection loaders are lazy async iterators:

```ts
import { getBlogs } from './loaders';

for await (const blog of getBlogs('published', { pageSize: 25 })) {
  // Process this record before requesting more content.
}
```

The default batch size is 100, configurable from 1 to 100. Constructing `getPublishedCollections()` starts no requests; stopping iteration leaves later pages unfetched. Detail and single-type loaders return promises. Keep queries, validation and domain mappings together, and retain only the display records needed by each page.

## Related code

- [Generated types](generated/README.md) documents the checked-in CMS schema and regeneration commands.
- [Page boundaries](../pages/README.md) explains how routes consume loaders and pass display props to React views.
- `astro-media.ts`, `inline-images.ts` and `public-images.ts` prepare CMS media for the [native image and social-card pipeline](../media/README.md).
