import type { AstroIntegration } from 'astro';
import { randomUUID } from 'node:crypto';
import { chmod, copyFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublishedContentSnapshot } from '../server/content/loaders.ts';
import { clearBuildSnapshotBridge, writeBuildSnapshotBridge } from '../server/content/build-snapshot-bridge.ts';
import { buildPublishedSocialCards } from '../server/content/public-images.ts';

export interface PublicImagesIntegrationOptions {
  /** Must return the published snapshot for a new caller-owned scope each build. */
  loadPublishedSnapshot: () => Promise<PublishedContentSnapshot>;
  mapboxToken?: string;
  siteTitle?: string;
  stagingDir?: string;
  cacheDir?: string;
}

function mediaHostAllowlist(): string[] {
  const hosts = new Set<string>();
  const strapiApiUrl = process.env.GATSBY_STRAPI_API_URL;
  if (strapiApiUrl) {
    try { hosts.add(new URL(strapiApiUrl).hostname.toLowerCase()); }
    catch { throw new Error('GATSBY_STRAPI_API_URL must be an absolute URL to derive media hosts'); }
  }
  for (const rawHost of (process.env.STRAPI_MEDIA_HOSTS || '').split(',')) {
    const host = rawHost.trim().toLowerCase();
    if (!host) continue;
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?))*$/.test(host)) {
      throw new Error('STRAPI_MEDIA_HOSTS must be a comma-separated list of hostnames without schemes or ports');
    }
    hosts.add(host);
  }
  return [...hosts];
}

function imagePathsFromDescriptors(descriptors: Record<string, { src: string; sources?: Array<{ src: string }>; srcSet?: string; formats?: Array<{ srcSet: string }> }>): string[] {
  const paths: string[] = [];
  for (const descriptor of Object.values(descriptors)) {
    paths.push(descriptor.src);
    for (const candidate of descriptor.sources ?? []) paths.push(candidate.src);
    for (const candidate of descriptor.srcSet?.split(',') ?? []) paths.push(candidate.trim().split(/\s+/)[0]);
    for (const format of descriptor.formats ?? []) {
      for (const candidate of format.srcSet.split(',')) paths.push(candidate.trim().split(/\s+/)[0]);
    }
  }
  return paths;
}

/** Runs only for static builds; SSR and dev never generate public images or read build snapshots. */
export function publicImagesIntegration(options: PublicImagesIntegrationOptions): AstroIntegration {
  let isStaticBuild = false;
  let buildId = '';
  let snapshotPath = '';
  let manifestPath = '';
  let stagingPublicDir = '';
  let imageCacheDir = '';
  let generatedPaths: string[] = [];

  const cleanup = async () => {
    if (buildId && snapshotPath) await clearBuildSnapshotBridge(buildId, snapshotPath);
    if (process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH === manifestPath) delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
    if (manifestPath) await rm(manifestPath, { force: true });
    buildId = '';
    snapshotPath = '';
    manifestPath = '';
    generatedPaths = [];
  };

  return {
    name: 'aasc-public-images',
    hooks: {
      'astro:config:setup': async ({ config, command }) => {
        isStaticBuild = command === 'build' && config.output === 'static';
      },
      'astro:build:start': async ({ logger }) => {
        if (!isStaticBuild) return;
        await cleanup();
        delete process.env.ASTRO_BUILD_SNAPSHOT_ID;
        delete process.env.ASTRO_BUILD_SNAPSHOT_PATH;
        delete process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH;
        buildId = randomUUID();
        stagingPublicDir = options.stagingDir || path.resolve(process.cwd(), '.astro', 'public-images');
        imageCacheDir = options.cacheDir || path.resolve(process.cwd(), '.astro', 'public-image-cache');
        manifestPath = path.resolve(process.cwd(), '.astro', 'public-image-manifests', `${buildId}.json`);
        try {
          const snapshot = await options.loadPublishedSnapshot();
          snapshotPath = await writeBuildSnapshotBridge(buildId, snapshot);
          process.env.ASTRO_BUILD_SNAPSHOT_ID = buildId;
          process.env.ASTRO_BUILD_SNAPSHOT_PATH = snapshotPath;

          const imageBuild = await buildPublishedSocialCards({
            blogs: snapshot.blogs,
            clinics: snapshot.clinics,
            conditions: snapshot.conditions,
          }, {
            publicDir: stagingPublicDir,
            cacheDir: imageCacheDir,
            mapboxToken: options.mapboxToken,
            allowedMediaHosts: mediaHostAllowlist(),
            siteTitle: options.siteTitle,
          });
          generatedPaths = [
            ...imageBuild.cards.map((card) => card.imagePath),
            ...imagePathsFromDescriptors(imageBuild.mediaByRoute),
          ].filter((item, index, all) => all.indexOf(item) === index);

          await mkdir(path.dirname(manifestPath), { recursive: true, mode: 0o700 });
          await chmod(path.dirname(manifestPath), 0o700);
          const temporaryManifest = `${manifestPath}.${process.pid}.tmp`;
          const manifestEnvelope = { version: 1, buildId, result: imageBuild };
          await writeFile(temporaryManifest, `${JSON.stringify(manifestEnvelope, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
          await rename(temporaryManifest, manifestPath);
          process.env.ASTRO_BUILD_IMAGE_MANIFEST_PATH = manifestPath;
          logger.info(`Prepared ${imageBuild.cards.length} published social cards and ${Object.keys(imageBuild.mediaByRoute).length} responsive image sets.`);
        } catch (error) {
          await cleanup();
          throw error;
        }
      },
      'astro:build:done': async ({ dir }) => {
        if (!isStaticBuild) return;
        try {
          if (!generatedPaths.length) return;
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
