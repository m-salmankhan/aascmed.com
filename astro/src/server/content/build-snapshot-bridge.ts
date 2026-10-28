import { chmod, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PublishedContentSnapshot } from './loaders.ts';

const privateSnapshotDir = () => path.resolve(process.cwd(), '.astro', 'public-image-snapshots');
const validBuildId = (buildId: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(buildId);
const pathFor = (buildId: string) => path.join(privateSnapshotDir(), `${buildId}.json`);

export async function writeBuildSnapshotBridge(buildId: string, snapshot: PublishedContentSnapshot): Promise<string> {
  if (!validBuildId(buildId)) throw new Error('Invalid static build snapshot ID');
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

/** Read only the snapshot explicitly handed to this static build process. */
export async function readBuildSnapshotBridge(): Promise<PublishedContentSnapshot | null> {
  const buildId = process.env.ASTRO_BUILD_SNAPSHOT_ID;
  const configuredPath = process.env.ASTRO_BUILD_SNAPSHOT_PATH;
  if (!buildId || !configuredPath || !validBuildId(buildId)) return null;
  const expectedPath = pathFor(buildId);
  if (path.resolve(configuredPath) !== expectedPath) return null;

  let envelope: unknown;
  try { envelope = JSON.parse(await readFile(expectedPath, 'utf8')); }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') return null;
    throw new Error('Could not read the current static build snapshot');
  }
  if (!envelope || typeof envelope !== 'object') throw new Error('The current static build snapshot is malformed');
  const value = envelope as { version?: unknown; buildId?: unknown; snapshot?: unknown };
  if (value.version !== 1 || value.buildId !== buildId || !isPublishedContentSnapshot(value.snapshot)) {
    throw new Error('The current static build snapshot does not match this build');
  }
  return value.snapshot;
}

export async function clearBuildSnapshotBridge(buildId: string, snapshotPath: string): Promise<void> {
  if (process.env.ASTRO_BUILD_SNAPSHOT_ID === buildId) delete process.env.ASTRO_BUILD_SNAPSHOT_ID;
  if (process.env.ASTRO_BUILD_SNAPSHOT_PATH === snapshotPath) delete process.env.ASTRO_BUILD_SNAPSHOT_PATH;
  if (validBuildId(buildId) && path.resolve(snapshotPath) === pathFor(buildId)) {
    await rm(snapshotPath, { force: true });
  }
}

function isPublishedContentSnapshot(value: unknown): value is PublishedContentSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Record<string, unknown>;
  return ['blogs', 'clinics', 'conditions', 'providers', 'serviceUpdates', 'reviews']
    .every((key) => Array.isArray(snapshot[key]));
}
