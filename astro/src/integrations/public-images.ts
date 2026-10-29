// Static-build hook for staging social cards and responsive public media.
import type { AstroIntegration } from 'astro';
import { randomUUID } from 'node:crypto';
import {
  chmod,
  copyFile,
  mkdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MediaDescriptor } from '../../../src/shared/content/models.ts';
import type { PublishedContentSnapshot } from '../server/content/loaders.ts';
import {
  clearBuildSnapshotBridge,
  writeBuildSnapshotBridge,
} from '../server/content/build-snapshot-bridge.ts';
import {
  buildPublishedSocialCards,
  type PublishedImageManifestEnvelope,
} from '../server/content/public-images.ts';
/** Exact responsive fields copied from the image helper into the static output manifest. */
type ResponsiveMediaDescriptor = Pick<
  MediaDescriptor,
  'src' | 'sources' | 'srcSet' | 'formats'
>;
export interface PublicImagesIntegrationOptions {
  /** Load normalized published records using a fresh caller-owned scope for each build. */
  loadPublishedSnapshot: () => Promise<PublishedContentSnapshot>;
  /** Public Mapbox token used only to request clinic static maps during this build. */
  mapboxToken?: string;
  /** Brand title prefixed to clinic social-card titles. */
  siteTitle?: string;
  /** Optional private staging directory for generated public assets. */
  stagingDir?: string;
  /** Optional persistent private cache directory, outside public output. */
  cacheDir?: string;
}
/** Derive the remote-media hostname allowlist from Strapi and explicit CDN configuration.
 * @returns Unique lowercase hostnames that can supply build-time media bytes.
 */
function mediaHostAllowlist(): string[] {
  // Published uploads from this CMS project use a separate CDN hostname.
  const hosts = new Set<string>(['wise-positivity-21c2bd6b3f.media.strapiapp.com']);
  const strapiApiUrl = process.env.GATSBY_STRAPI_API_URL;
  if (strapiApiUrl) {
    try {
      hosts.add(new URL(strapiApiUrl).hostname.toLowerCase());
    } catch {
      throw new Error(
        'GATSBY_STRAPI_API_URL must be an absolute URL to derive media hosts',
      );
    }
  }
  for (const rawHost of (process.env.STRAPI_MEDIA_HOSTS || '').split(',')) {
    const host = rawHost.trim().toLowerCase();
    if (!host) {
      continue;
    }
    if (
      !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?))*$/.test(
        host,
      )
    ) {
      throw new Error(
        'STRAPI_MEDIA_HOSTS must be a comma-separated list of hostnames without schemes or ports',
      );
    }
    hosts.add(host);
  }
  return [...hosts];
}
/** Collect all default, responsive, and alternate-format URLs that must be copied to build output.
 * @param descriptors Responsive media descriptors keyed by full public route.
 * @returns Asset URLs needed by rendered pages, before deduplication by the integration hook.
 */
function imagePathsFromDescriptors(
  descriptors: Record<string, ResponsiveMediaDescriptor>,
): string[] {
  const paths: string[] = [];
  for (const descriptor of Object.values(descriptors)) {
    paths.push(descriptor.src);
    for (const candidate of descriptor.sources ?? []) {
      paths.push(candidate.src);
    }
    for (const candidate of descriptor.srcSet?.split(',') ?? []) {
      paths.push(candidate.trim().split(/\s+/)[0]);
    }
    for (const format of descriptor.formats ?? []) {
      for (const candidate of format.srcSet.split(',')) {
        paths.push(candidate.trim().split(/\s+/)[0]);
      }
    }
  }
  return paths;
}
/** Register build hooks that create public social cards and responsive media only for static production builds.
 * @param options Published-snapshot loader, optional Mapbox token/site title, and private staging/cache directories.
 * @returns Astro integration that stages images, exposes a private manifest during prerender, and copies generated assets.
 */
export function publicImagesIntegration(
  options: PublicImagesIntegrationOptions,
): AstroIntegration {
  let isStaticBuild = false;
  let buildId = '';
  let snapshotPath = '';
  let manifestPath = '';
  let stagingPublicDir = '';
  let imageCacheDir = '';
  let generatedPaths: string[] = [];
  /** Remove current private bridge files, clear process markers, and reset the build's generated path list.
   * @returns Promise<void> after the active build's private temporary state is removed.
   */
  const cleanup = async () => {
    if (buildId && snapshotPath) {
      await clearBuildSnapshotBridge(buildId, snapshotPath);
    }
    if (process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH === manifestPath) {
      delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
    }
    if (manifestPath) {
      await rm(manifestPath, { force: true });
    }
    buildId = '';
    snapshotPath = '';
    manifestPath = '';
    generatedPaths = [];
  };
  return {
    name: 'aasc-public-images',
    hooks: {
      /** Record whether Astro is building the static target; dev and SSR skip image generation.
       * @param context Astro config lifecycle data used to identify the command and output mode.
       * @returns Promise<void> after the integration stores the static-build flag.
       */
      'astro:config:setup': async ({ config, command }) => {
        isStaticBuild = command === 'build' && config.output === 'static';
      },
      /** Generate published images and private snapshot metadata before static route prerendering.
       * @param context Astro build logger used to report generated image counts.
       * @returns Promise<void> after the build snapshot, image outputs, and private manifest are ready.
       */
      'astro:build:start': async ({ logger }) => {
        if (!isStaticBuild) {
          return;
        }
        await cleanup();
        delete process.env.ASTRO_BUILD_SNAPSHOT_ID;
        delete process.env.ASTRO_BUILD_SNAPSHOT_PATH;
        delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
        buildId = randomUUID();
        stagingPublicDir =
          options.stagingDir ||
          path.resolve(process.cwd(), '.astro', 'public-images');
        imageCacheDir =
          options.cacheDir ||
          path.resolve(process.cwd(), '.astro', 'public-image-cache');
        manifestPath = path.resolve(
          process.cwd(),
          '.astro',
          'public-image-manifests',
          `${buildId}.json`,
        );
        try {
          const snapshot = await options.loadPublishedSnapshot();
          snapshotPath = await writeBuildSnapshotBridge(buildId, snapshot);
          process.env.ASTRO_BUILD_SNAPSHOT_ID = buildId;
          process.env.ASTRO_BUILD_SNAPSHOT_PATH = snapshotPath;
          const imageBuild = await buildPublishedSocialCards(
            {
              blogs: snapshot.blogs,
              clinics: snapshot.clinics,
              conditions: snapshot.conditions,
            },
            {
              publicDir: stagingPublicDir,
              cacheDir: imageCacheDir,
              mapboxToken: options.mapboxToken,
              allowedMediaHosts: mediaHostAllowlist(),
              siteTitle: options.siteTitle,
            },
          );
          generatedPaths = [
            ...imageBuild.cards.map((card) => card.imagePath),
            ...imagePathsFromDescriptors(imageBuild.mediaByRoute),
          ].filter((item, index, all) => all.indexOf(item) === index);
          await mkdir(path.dirname(manifestPath), {
            recursive: true,
            mode: 0o700,
          });
          await chmod(path.dirname(manifestPath), 0o700);
          const temporaryManifest = `${manifestPath}.${process.pid}.tmp`;
          const manifestEnvelope: PublishedImageManifestEnvelope = {
            version: 1,
            buildId,
            result: imageBuild,
          };
          await writeFile(
            temporaryManifest,
            `${JSON.stringify(manifestEnvelope, null, 2)}\n`,
            {
              flag: 'wx',
              mode: 0o600,
            },
          );
          await rename(temporaryManifest, manifestPath);
          process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH = manifestPath;
          logger.info(
            `Prepared ${imageBuild.cards.length} published social cards and ${Object.keys(imageBuild.mediaByRoute).length} responsive image sets.`,
          );
        } catch (error) {
          await cleanup();
          throw error;
        }
      },
      /** Copy staged image assets into static output and clear private build state after completion.
       * @param context Astro output directory populated by the completed static build.
       * @returns Promise<void> after generated files are copied and private state is removed.
       */
      'astro:build:done': async ({ dir }) => {
        if (!isStaticBuild) {
          return;
        }
        try {
          if (!generatedPaths.length) {
            return;
          }
          const outputDir = fileURLToPath(dir);
          for (const imagePath of generatedPaths) {
            const relativePath = imagePath.replace(/^\/+/, '');
            const source = path.join(stagingPublicDir, relativePath);
            const destination = path.join(outputDir, relativePath);
            await mkdir(path.dirname(destination), { recursive: true });
            await copyFile(source, destination);
          }
        } finally {
          await cleanup();
        }
      },
    },
  };
}
