import { createPublicConfig } from '../../../src/shared/config/public';

/** Astro PUBLIC_ variables are safe to pass as props to a React island. */
export const astroPublicConfig = createPublicConfig({
  runtimeApiBaseUrl: import.meta.env.PUBLIC_RUNTIME_API_BASE_URL,
  mapboxAccessToken: import.meta.env.PUBLIC_MAPBOX_API_KEY,
});
