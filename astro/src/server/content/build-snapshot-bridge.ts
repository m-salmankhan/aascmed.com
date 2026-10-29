// Private per-build bridge that lets Astro prerender reuse the static image hook's published snapshot.
import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import type { PublishedContentSnapshot } from './loaders.ts';
/** Shape stored in the private bridge file to bind data to one static build.
 * @property version Current bridge serialization version.
 * @property buildId Random identifier shared with the static integration process.
 * @property snapshot Normalized published content loaded for this build.
 */
interface PublishedSnapshotEnvelope {
  version: 1;
  buildId: string;
  snapshot: PublishedContentSnapshot;
}
/** Arbitrary JSON object inspected before it is narrowed to a published snapshot. */
type UnknownRecord = Record<string, unknown>;
/** Resolve the private directory used only for one static image build's snapshot bridge.
 * @returns Absolute `.astro` path that is excluded from public output.
 */
const privateSnapshotDir = () => {
  return path.resolve(process.cwd(), '.astro', 'public-image-snapshots');
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
/** Build the expected private snapshot filename for one build.
 * @param buildId Valid version-4 build UUID.
 * @returns Absolute path under the private snapshot directory.
 */
const pathFor = (buildId: string) => {
  return path.join(privateSnapshotDir(), `${buildId}.json`);
};
/** Write a normalized published snapshot atomically with owner-only permissions.
 * @param buildId Unique ID generated for the current static build.
 * @param snapshot Published records shared by image generation and Astro prerender routes.
 * @returns Absolute path to the private snapshot envelope.
 */
export async function writeBuildSnapshotBridge(
  buildId: string,
  snapshot: PublishedContentSnapshot,
): Promise<string> {
  if (!validBuildId(buildId)) {
    throw new Error('Invalid static build snapshot ID');
  }
  const directory = privateSnapshotDir();
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const destination = pathFor(buildId);
  const temporary = `${destination}.${process.pid}.tmp`;
  const envelope = JSON.stringify({ version: 1, buildId, snapshot });
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
/** Read only the snapshot explicitly handed to this static build process.
 * @returns The matching published snapshot, or null when this process has no matching bridge.
 */
export async function readBuildSnapshotBridge(): Promise<PublishedContentSnapshot | null> {
  const buildId = process.env.ASTRO_BUILD_SNAPSHOT_ID;
  const configuredPath = process.env.ASTRO_BUILD_SNAPSHOT_PATH;
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
    throw new Error('Could not read the current static build snapshot');
  }
  if (!envelope || typeof envelope !== 'object') {
    throw new Error('The current static build snapshot is malformed');
  }
  const value = envelope as Partial<PublishedSnapshotEnvelope> & UnknownRecord;
  if (
    value.version !== 1 ||
    value.buildId !== buildId ||
    !isPublishedContentSnapshot(value.snapshot)
  ) {
    throw new Error(
      'The current static build snapshot does not match this build',
    );
  }
  return value.snapshot;
}
/** Clear matching process markers and remove the private snapshot file after prerendering.
 * @param buildId Build UUID whose environment markers and bridge should be cleared.
 * @param snapshotPath Bridge path returned by the writer for this build.
 * @returns Promise<void> after a matching file has been removed.
 */
export async function clearBuildSnapshotBridge(
  buildId: string,
  snapshotPath: string,
): Promise<void> {
  if (process.env.ASTRO_BUILD_SNAPSHOT_ID === buildId) {
    delete process.env.ASTRO_BUILD_SNAPSHOT_ID;
  }
  if (process.env.ASTRO_BUILD_SNAPSHOT_PATH === snapshotPath) {
    delete process.env.ASTRO_BUILD_SNAPSHOT_PATH;
  }
  if (
    validBuildId(buildId) &&
    path.resolve(snapshotPath) === pathFor(buildId)
  ) {
    await rm(snapshotPath, { force: true });
  }
}
/** Validate the six published collections before a JSON bridge is trusted by prerender code.
 * @param value Decoded snapshot payload from the private envelope.
 * @returns True when every required collection is an array.
 */
function isPublishedContentSnapshot(
  value: unknown,
): value is PublishedContentSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const snapshot = value as UnknownRecord;
  return [
    'blogs',
    'clinics',
    'conditions',
    'providers',
    'serviceUpdates',
    'reviews',
  ].every((key) => Array.isArray(snapshot[key]));
}
