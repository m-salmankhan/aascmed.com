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

  const statuses = await github.paginate(github.rest.repos.listCommitStatusesForRef, {
    owner, repo, ref: pr.head.sha, per_page: 100,
  });
  const deployment = statuses.find(status => status.context === NETLIFY_CONTEXT);
  assert.ok(deployment, "Netlify has not reported a deploy preview for the current PR commit yet");
  assert.equal(deployment.state, "success", "Wait for the current PR commit's Netlify deploy preview to succeed, then try again");

  const candidateURL = new URL(deployment.target_url);
  assert.equal(candidateURL.protocol, "https:", "Netlify deploy preview must use HTTPS");
  assert.equal(candidateURL.hostname, `deploy-preview-${pullNumber}--aascmed.netlify.app`, "Netlify status does not point to this PR's deploy preview");
  candidateURL.pathname = "/";
  candidateURL.search = "";
  candidateURL.hash = "";

  return {
    pullNumber,
    candidateURL: candidateURL.href,
    referenceURL: MAIN_REFERENCE_URL,
    candidateCommit: pr.head.sha,
    baselineId: `Netlify main build at ${pr.base.sha}; PR #${pullNumber} preview at ${pr.head.sha}. Page content may have changed between builds.`,
  };
}

module.exports = { resolveCommentTargets, MAIN_REFERENCE_URL, NETLIFY_CONTEXT };
