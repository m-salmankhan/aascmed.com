// Stages public social cards before Astro emits the configured site output.
import type { AstroIntegration } from 'astro';
import { getPublicMediaHosts } from '../config/public-media-hosts.ts';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublishedCollections } from '../server/content/loaders.ts';
import { buildPublishedSocialCards } from '../server/content/public-images.ts';

export interface PublicImagesIntegrationOptions {
  /** Create lazy published streams; the hook consumes only blogs, conditions and clinics. */
  loadPublishedCollections: () => Promise<PublishedCollections>;
  /** Public Mapbox token used only to request clinic static maps during this build. */
  mapboxToken?: string;
  /** Brand title prefixed to clinic social-card titles. */
  siteTitle?: string;
  /** Optional private staging directory for generated public assets. */
  stagingDir?: string;
  /** Optional persistent private cache directory, outside public output. */
  cacheDir?: string;
}

/** Derive the social-card download allowlist from Astro's configured media origins.
 * @returns Unique lowercase hostnames that may provide CMS or Mapbox image bytes.
 */
function mediaHostAllowlist(): string[] {
  return [...new Set(getPublicMediaHosts().map(({ hostname }) => hostname))];
}

/** Register the static lifecycle hooks that create and copy published social cards.
 * @param options Published collection loader, optional Mapbox token, title and private staging/cache paths.
 * @returns Astro integration that prepares cards for static output; responsive media uses astro:assets at page render.
 */
export function publicImagesIntegration(
  options: PublicImagesIntegrationOptions,
): AstroIntegration {
  let isStaticBuild = false;
  let stagingPublicDir = '';
  let generatedPaths: string[] = [];

  return {
    name: 'aasc-public-images',
    hooks: {
      /** Remember whether the current Astro command targets a static production build.
       * @param context Astro config lifecycle values used to identify build command and output mode.
       * @returns Promise<void> after storing the lifecycle flag.
       */
      'astro:config:setup': async ({ config, command }) => {
        isStaticBuild = command === 'build' && config.output === 'static';
      },
      /** Generate social cards from lazy published streams before prerendering begins.
       * @param context Astro build logger used to report the prepared card count.
       * @returns Promise<void> after generated cards are staged for Astro's output copy hook.
       */
      'astro:build:start': async ({ logger }) => {
        if (!isStaticBuild) return;
        generatedPaths = [];
        stagingPublicDir =
          options.stagingDir ||
          path.resolve(process.cwd(), '.astro', 'public-images');
        const imageCacheDir =
          options.cacheDir ||
          path.resolve(process.cwd(), '.astro', 'public-image-cache');
        const collections = await options.loadPublishedCollections();
        const cards = await buildPublishedSocialCards(
          {
            blogs: collections.blogs,
            clinics: collections.clinics,
            conditions: collections.conditions,
          },
          {
            publicDir: stagingPublicDir,
            cacheDir: imageCacheDir,
            mapboxToken: options.mapboxToken,
            allowedMediaHosts: mediaHostAllowlist(),
            siteTitle: options.siteTitle,
          },
        );
        generatedPaths = [...new Set(cards.map(({ imagePath }) => imagePath))];
        logger.info(`Prepared ${cards.length} published social cards.`);
      },
      /** Copy staged social cards into static output after Astro has generated pages and assets.
       * @param context Astro output directory populated by the completed static build.
       * @returns Promise<void> after cards are copied or partial copies are removed on error.
       */
      'astro:build:done': async ({ dir }) => {
        if (!isStaticBuild) return;
        const copiedPaths: string[] = [];
        try {
          const outputDir = fileURLToPath(dir);
          for (const imagePath of generatedPaths) {
            const relativePath = imagePath.replace(/^\/+/, '');
            const source = path.join(stagingPublicDir, relativePath);
            const destination = path.join(outputDir, relativePath);
            await mkdir(path.dirname(destination), { recursive: true });
            copiedPaths.push(destination);
            await copyFile(source, destination);
          }
        } catch (error) {
          for (const destination of copiedPaths) {
            await rm(destination, { force: true });
          }
          throw error;
        } finally {
          generatedPaths = [];
        }
      },
    },
  };
}
