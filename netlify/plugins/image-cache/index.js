// Persist only generated image artifacts; Netlify supplies the cache utility.
const { rm } = require('node:fs/promises');

const cachePaths = [
  'node_modules/.astro/assets',
  '.astro/public-images',
  '.astro/public-image-cache',
];

module.exports = {
  async onPreBuild({ utils: { cache } }) {
    for (const directory of cachePaths) {
      try {
        const restored = await cache.restore(directory);
        console.log(`[image-cache] ${restored ? 'Restored' : 'No saved cache for'} ${directory}`);
      } catch {
        // A failed restore can leave partial files. Discard only that cache.
        await rm(directory, { recursive: true, force: true });
        console.warn(`[image-cache] Could not restore ${directory}; rebuilding it.`);
      }
    }
  },

  async onPostBuild({ utils: { cache } }) {
    for (const directory of cachePaths) {
      try {
        const saved = await cache.save(directory);
        console.log(`[image-cache] ${saved ? 'Saved' : 'Nothing to save for'} ${directory}`);
      } catch {
        console.warn(`[image-cache] Could not save ${directory}; the next build may regenerate it.`);
      }
    }
  },
};
