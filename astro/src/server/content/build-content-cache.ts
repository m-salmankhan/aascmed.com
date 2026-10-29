// Private per-build cache that lets Astro prerender reuse the static image hook's published collections.
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { PublishedCollections } from './loaders.ts';
/** Shape stored in the private cache file to bind data to one static build.
 * @property version Current cache serialization version.
 * @property buildId Random identifier shared with the static integration process.
 * @property collections Normalized published content loaded for this build.
 */
interface BuildContentCacheFile {
  version: 1;
  buildId: string;
  collections: PublishedCollections;
}
/** Arbitrary JSON object inspected before it is narrowed to published collections. */
type UnknownRecord = Record<string, unknown>;
/** Resolve the private directory used only for one static image build's content cache.
 * @returns Absolute `.astro` path that is excluded from public output.
 */
const privateContentCacheDir = () => {
  return path.resolve(process.cwd(), '.astro', 'build-content-cache');
};
/** Check that a build identifier is a canonical version-4 UUID before using it in a path.
 * @param buildId Candidate ID from the server-only build environment.
 * @returns True only for a version-4 UUID.
 */
const validBuildId = (buildId: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    buildId,
  );
};
/** Build the expected private content-cache filename for one build.
 * @param buildId Valid version-4 build UUID.
 * @returns Absolute path under the private content-cache directory.
 */
const pathFor = (buildId: string) => {
  return path.join(privateContentCacheDir(), `${buildId}.json`);
};
/** Write a normalized published collections atomically with owner-only permissions.
 * @param buildId Unique ID generated for the current static build.
 * @param collections Published records shared by image generation and Astro prerender routes.
 * @returns Absolute path to the private content-cache file.
 */
export async function writeBuildContentCache(
  buildId: string,
  collections: PublishedCollections,
): Promise<string> {
  if (!validBuildId(buildId)) {
    throw new Error('Invalid static build content-cache ID');
  }
  const directory = privateContentCacheDir();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const destination = pathFor(buildId);
  const temporary = `${destination}.${process.pid}.tmp`;
  const envelope = JSON.stringify({ version: 1, buildId, collections });
  try {
    await writeFile(temporary, `${envelope}\n`, { flag: 'wx', mode: 0o600 });
    await rename(temporary, destination);
    await chmod(destination, 0o600);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return destination;
}
/** Read only the collections explicitly handed to this static build process.
 * @returns The matching published collections, or null when this process has no matching cache.
 */
export async function readBuildContentCache(): Promise<PublishedCollections | null> {
  const buildId = process.env.ASTRO_BUILD_CONTENT_CACHE_ID;
  const configuredPath = process.env.ASTRO_BUILD_CONTENT_CACHE_PATH;
  if (!buildId || !configuredPath || !validBuildId(buildId)) {
    return null;
  }
  const expectedPath = pathFor(buildId);
  if (path.resolve(configuredPath) !== expectedPath) {
    return null;
  }
  let envelope: unknown;
  try {
    envelope = JSON.parse(await readFile(expectedPath, 'utf8'));
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return null;
    }
    throw new Error('Could not read the current static build cache');
  }
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('The current static build cache file is malformed');
  }
  const value = envelope as Partial<BuildContentCacheFile> & UnknownRecord;
  if (
    value.version !== 1 ||
    value.buildId !== buildId ||
    !isPublishedCollections(value.collections)
  ) {
    throw new Error(
      'The current static build cache does not match this build',
    );
  }
  return value.collections;
}
/** Clear matching process markers and remove the private content-cache file after prerendering.
 * @param buildId Build UUID whose environment markers and cache should be cleared.
 * @param contentCachePath Private cache file path returned by the writer for this build.
 * @returns Promise<void> after a matching file has been removed.
 */
export async function clearBuildContentCache(
  buildId: string,
  contentCachePath: string,
): Promise<void> {
  if (process.env.ASTRO_BUILD_CONTENT_CACHE_ID === buildId) {
    delete process.env.ASTRO_BUILD_CONTENT_CACHE_ID;
  }
  if (process.env.ASTRO_BUILD_CONTENT_CACHE_PATH === contentCachePath) {
    delete process.env.ASTRO_BUILD_CONTENT_CACHE_PATH;
  }
  if (
    validBuildId(buildId) &&
    path.resolve(contentCachePath) === pathFor(buildId)
  ) {
    await rm(contentCachePath, { force: true });
  }
}
/** Validate the six published collections before a JSON cache is trusted by prerender code.
 * @param value Decoded collection payload from the private envelope.
 * @returns True when every required collection is an array.
 */
function isPublishedCollections(
  value: unknown,
): value is PublishedCollections {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const collections = value as UnknownRecord;
  return [
    'blogs',
    'clinics',
    'conditions',
    'providers',
    'serviceUpdates',
    'reviews',
  ].every((key) => Array.isArray(collections[key]));
}
