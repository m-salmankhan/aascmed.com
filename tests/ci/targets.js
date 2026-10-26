const assert = require("node:assert/strict");

const MAIN_REFERENCE_URL = "https://main--aascmed.netlify.app/";
const NETLIFY_CONTEXT = "netlify/aascmed/deploy-preview";

async function resolveCommentTargets({ github, owner, repo, pullNumber, actor }) {
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: pullNumber });
  assert.equal(pr.state, "open", "The regression comparison PR must be open");
  assert.equal(pr.base.ref, "main", "The regression comparison currently supports PRs targeting main");
  assert.equal(pr.head.repo?.full_name, `${owner}/${repo}`, "Fork PRs cannot run the privileged regression workflow");

  const { data: access } = await github.rest.repos.getCollaboratorPermissionLevel({ owner, repo, username: actor });
  assert.ok(["admin", "maintain", "write"].includes(access.permission), "Commenter needs write access to run the regression comparison");

  const { data: main } = await github.rest.repos.getBranch({ owner, repo, branch: "main" });
  assert.equal(pr.base.sha, main.commit.sha, "Update the PR branch to current main before running the comparison");

  const { data: comparison } = await github.rest.repos.compareCommits({
    owner,
    repo,
    base: main.commit.sha,
    head: pr.head.sha,
  });
  assert.ok(
    ["ahead", "identical"].includes(comparison.status),
    "Update the PR branch to include the current main commit before running the comparison",
  );

  const statuses = await github.paginate(github.rest.repos.listCommitStatusesForRef, {
    owner, repo, ref: pr.head.sha, per_page: 100,
  });
  const candidateHostname = `deploy-preview-${pullNumber}--aascmed.netlify.app`;
  const contextStatuses = statuses
    .filter(status => status.context === NETLIFY_CONTEXT)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const deployment = contextStatuses
    .find(status => {
      try {
        return new URL(status.target_url).hostname === candidateHostname;
      } catch {
        return false;
      }
    });
  assert.ok(deployment, `Netlify has not reported a deploy preview for PR #${pullNumber} at the current commit yet`);
  const newerStatuses = contextStatuses.filter(status => status.created_at > deployment.created_at);
  for (const newerStatus of newerStatuses) {
    let newerHost;
    try {
      newerHost = new URL(newerStatus.target_url).hostname;
    } catch {}
    assert.match(
      newerHost || "",
      /^deploy-preview-\d+--aascmed\.netlify\.app$/,
      "Netlify reported a newer preview status that cannot be matched to a PR; wait for it to finish before retrying",
    );
  }
  assert.equal(deployment.state, "success", "Wait for the current PR commit's Netlify deploy preview to succeed, then try again");

  const candidateURL = new URL(deployment.target_url);
  assert.equal(candidateURL.protocol, "https:", "Netlify deploy preview must use HTTPS");
  assert.equal(candidateURL.hostname, candidateHostname, "Netlify status does not point to this PR's deploy preview");
  candidateURL.pathname = "/";
  candidateURL.search = "";
  candidateURL.hash = "";

  return {
    pullNumber,
    candidateURL: candidateURL.href,
    referenceURL: MAIN_REFERENCE_URL,
    candidateCommit: pr.head.sha,
    baselineId: `Latest successful Netlify main branch deployment (main was ${main.commit.sha} when the comparison started; the branch alias is not pinned to that commit); PR #${pullNumber} preview at ${pr.head.sha}. Page content may have changed between builds.`,
  };
}

module.exports = { resolveCommentTargets, MAIN_REFERENCE_URL, NETLIFY_CONTEXT };
