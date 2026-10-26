import type { AstroIntegration } from 'astro';
import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPublishedSocialCards, type PublishedImageCollections } from '../server/content/public-images.ts';

export interface PublicImagesIntegrationOptions {
  /** Must return the static build's memoized published content snapshot. */
  loadPublishedCollections: () => Promise<PublishedImageCollections>;
  mapboxToken?: string;
  siteTitle?: string;
  stagingDir?: string;
  cacheDir?: string;
}

/** Static-only Astro hook: build cards before routes prerender, then copy them into the final output. */
export function publicImagesIntegration(options: PublicImagesIntegrationOptions): AstroIntegration {
  let isStaticBuild = false;
  let generatedPaths: string[] = [];
  let stagingPublicDir = '';
  let imageCacheDir = options.cacheDir || path.resolve(process.cwd(), '.astro', 'public-image-cache');

  return {
    name: 'aasc-public-images',
    hooks: {
      'astro:config:setup': async ({ config, command }) => {
        isStaticBuild = command === 'build' && config.output === 'static';
      },
      'astro:build:start': async ({ logger }) => {
        if (!isStaticBuild) return;
        stagingPublicDir = options.stagingDir || path.resolve(process.cwd(), '.astro', 'public-images');
        const collections = await options.loadPublishedCollections();
        const cards = await buildPublishedSocialCards(collections, {
          publicDir: stagingPublicDir,
          cacheDir: imageCacheDir,
          mapboxToken: options.mapboxToken,
          siteTitle: options.siteTitle,
        });
        generatedPaths = cards.map((card) => card.imagePath);
        logger.info(`Prepared ${cards.length} published social cards from the build snapshot.`);
      },
      'astro:build:done': async ({ dir }) => {
        if (!isStaticBuild || generatedPaths.length === 0) return;
        const outputDir = fileURLToPath(dir);
        for (const imagePath of generatedPaths) {
          const relativePath = imagePath.replace(/^\/+/, '');
          const source = path.join(stagingPublicDir, relativePath);
          const destination = path.join(outputDir, relativePath);
          await mkdir(path.dirname(destination), { recursive: true });
          await copyFile(source, destination);
        }
      },
    },
  };
}
