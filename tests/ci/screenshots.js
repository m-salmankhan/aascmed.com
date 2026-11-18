const { realpath } = require("node:fs/promises");
const { sep } = require("node:path");
const assert = require("node:assert/strict");
const sharp = require("sharp");

async function publishScreenshots({ github, owner, repo, pullNumber, pairs }) {
  // shortcut: Show up to four changed comparisons inline; the artifact holds the complete set at full resolution.
  const changed = pairs.filter(pair => pair.changed);
  const selected = changed.length ? changed.slice(0, 4) : pairs.slice(0, 2);
  if (!selected.length) return [];

  const git = github.rest.git;
  const repository = { owner, repo };
  const root = await realpath("test-results");
  const tree = [];
  for (const [index, pair] of selected.entries()) {
    for (const side of ["reference", "candidate"]) {
      const filename = await realpath(pair[side]);
      assert.ok(filename.startsWith(root + sep), "Screenshot must be inside test-results");
      const image = await sharp(filename).resize({ width: 720, height: 1800, fit: "inside", withoutEnlargement: true }).webp().toBuffer();
      const { data: blob } = await git.createBlob({ ...repository, content: image.toString("base64"), encoding: "base64" });
      tree.push({ path: `${index + 1}-${side}.webp`, mode: "100644", type: "blob", sha: blob.sha });
    }
  }
  const { data: snapshot } = await git.createTree({ ...repository, tree });
  const ref = `heads/regression-screenshots/pr-${pullNumber}`;
  let parent;
  try {
    ({ data: { object: { sha: parent } } } = await git.getRef({ ...repository, ref }));
  } catch (error) {
    if (error.status !== 404) throw error;
  }
  const { data: commit } = await git.createCommit({
    ...repository, message: `Store regression screenshots for PR #${pullNumber}`,
    tree: snapshot.sha, parents: parent ? [parent] : [],
  });
  if (parent) await git.updateRef({ ...repository, ref, sha: commit.sha });
  else await git.createRef({ ...repository, ref: `refs/${ref}`, sha: commit.sha });

  const base = `https://raw.githubusercontent.com/${owner}/${repo}/${commit.sha}`;
  return selected.map(({ title, project }, index) => ({
    title, project,
    reference: `${base}/${index + 1}-reference.webp`,
    candidate: `${base}/${index + 1}-candidate.webp`,
  }));
}

module.exports = { publishScreenshots };
