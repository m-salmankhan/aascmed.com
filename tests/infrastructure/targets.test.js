const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveCommentTargets, MAIN_REFERENCE_URL, NETLIFY_CONTEXT } = require("../ci/targets");

const OWNER = "owner";
const REPO = "repo";
const MAIN_SHA = "main-sha";
const HEAD_SHA = "head-sha";
const PR_NUMBER = 120;
const CANDIDATE_URL = `https://deploy-preview-${PR_NUMBER}--aascmed.netlify.app/`;

function status({ url = CANDIDATE_URL, state = "success", createdAt = "2026-01-01T00:00:00Z", context = NETLIFY_CONTEXT } = {}) {
  return { context, state, target_url: url, created_at: createdAt };
}

function setup(overrides = {}) {
  const state = {
    pr: {
      state: "open",
      base: { ref: "main", sha: MAIN_SHA },
      head: { sha: HEAD_SHA, repo: { full_name: `${OWNER}/${REPO}` } },
    },
    permission: "write",
    mainSha: MAIN_SHA,
    compareStatus: "ahead",
    statuses: [status()],
    ...overrides,
  };
  const calls = { compare: 0, statuses: 0 };
  const github = {
    rest: {
      pulls: { get: async () => ({ data: state.pr }) },
      repos: {
        getCollaboratorPermissionLevel: async () => ({ data: { permission: state.permission } }),
        getBranch: async () => ({ data: { commit: { sha: state.mainSha } } }),
        compareCommits: async args => {
          calls.compare++;
          calls.compareArgs = args;
          return { data: { status: state.compareStatus } };
        },
        listCommitStatusesForRef: async () => ({ data: state.statuses }),
      },
    },
    paginate: async (_, args) => {
      calls.statuses++;
      calls.statusArgs = args;
      return state.statuses;
    },
  };
  return {
    state,
    calls,
    resolve: () => resolveCommentTargets({ github, owner: OWNER, repo: REPO, pullNumber: PR_NUMBER, actor: "reviewer" }),
  };
}

test("resolves the requested PR's preview even when another PR has a newer shared-SHA status", async () => {
  const setupState = setup({ statuses: [
    status({ url: "https://deploy-preview-121--aascmed.netlify.app/", createdAt: "2026-01-03T00:00:00Z" }),
    status({ createdAt: "2026-01-02T00:00:00Z" }),
  ] });

  const result = await setupState.resolve();

  assert.equal(result.pullNumber, PR_NUMBER);
  assert.equal(result.candidateURL, CANDIDATE_URL);
  assert.equal(result.referenceURL, MAIN_REFERENCE_URL);
  assert.equal(result.candidateCommit, HEAD_SHA);
  assert.match(result.baselineId, new RegExp(MAIN_SHA));
  assert.deepEqual(setupState.calls.compareArgs, { owner: OWNER, repo: REPO, base: MAIN_SHA, head: HEAD_SHA });
});

test("rejects commenters without write access before checking the branch or deployments", async () => {
  const setupState = setup({ permission: "read" });

  await assert.rejects(setupState.resolve(), /write access/i);

  assert.equal(setupState.calls.compare, 0);
  assert.equal(setupState.calls.statuses, 0);
});

test("rejects closed, fork, or non-main PRs", async t => {
  const cases = [
    ["closed PR", { pr: { ...setup().state.pr, state: "closed" } }, /must be open/i],
    ["fork PR", { pr: { ...setup().state.pr, head: { sha: HEAD_SHA, repo: { full_name: "contributor/repo" } } } }, /Fork PRs/i],
    ["other base branch", { pr: { ...setup().state.pr, base: { ref: "develop", sha: MAIN_SHA } } }, /targeting main/i],
  ];

  for (const [name, overrides, expected] of cases) {
    await t.test(name, async () => assert.rejects(setup(overrides).resolve(), expected));
  }
});

test("requires the PR base and head to include the current main commit", async t => {
  await t.test("PR base is stale", async () => {
    const setupState = setup({ pr: { ...setup().state.pr, base: { ref: "main", sha: "old-main-sha" } } });
    await assert.rejects(setupState.resolve(), /current main/i);
    assert.equal(setupState.calls.compare, 0);
  });

  for (const compareStatus of ["behind", "diverged"]) {
    await t.test(`PR head is ${compareStatus}`, async () => {
      const setupState = setup({ compareStatus });
      await assert.rejects(setupState.resolve(), /include the current main/i);
      assert.equal(setupState.calls.compare, 1);
    });
  }
});

test("rejects missing or unrelated preview statuses", async t => {
  const cases = [
    ["missing", []],
    ["other PR only", [status({ url: "https://deploy-preview-121--aascmed.netlify.app/" })]],
    ["wrong context", [status({ context: "another/check" })]],
  ];

  for (const [name, statuses] of cases) {
    await t.test(name, async () => assert.rejects(setup({ statuses }).resolve(), /has not reported a deploy preview/i));
  }
});

test("rejects pending and failed statuses for the requested PR instead of reusing an older success", async t => {
  for (const state of ["pending", "failure"]) {
    await t.test(state, async () => {
      const setupState = setup({ statuses: [
        status({ state, createdAt: "2026-01-02T00:00:00Z" }),
        status({ createdAt: "2026-01-01T00:00:00Z" }),
      ] });
      await assert.rejects(setupState.resolve(), /deploy preview to succeed/i);
    });
  }
});

test("rejects a newer ambiguous Netlify status rather than labeling an older success as current", async () => {
  const setupState = setup({ statuses: [
    status({ url: "https://app.netlify.com/projects/aascmed/deploys/new", state: "pending", createdAt: "2026-01-02T00:00:00Z" }),
    status({ createdAt: "2026-01-01T00:00:00Z" }),
  ] });

  await assert.rejects(setupState.resolve(), /newer preview status that cannot be matched/i);
});

test("rejects an ambiguous status between the requested PR success and another PR's newer success", async () => {
  const setupState = setup({ statuses: [
    status({ url: "https://deploy-preview-121--aascmed.netlify.app/", createdAt: "2026-01-03T00:00:00Z" }),
    status({ url: "https://app.netlify.com/projects/aascmed/deploys/pending", state: "pending", createdAt: "2026-01-02T00:00:00Z" }),
    status({ createdAt: "2026-01-01T00:00:00Z" }),
  ] });

  await assert.rejects(setupState.resolve(), /newer preview status that cannot be matched/i);
});
