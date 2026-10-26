const { test } = require("node:test");
const assert = require("node:assert/strict");
const { summarizeReport, reviewBody, publishReview, validatePullRequest } = require("../ci/review");

function report(annotations = [], unexpected = 0) {
  return {
    stats: { expected: 1 - unexpected, unexpected, skipped: 0, flaky: 0 },
    errors: [],
    suites: [{ suites: [{ specs: [{
      title: "/ matches reference content, metadata, links, forms and appearance",
      tests: [{ projectName: "mobile", annotations }],
    }] }] }],
  };
}

function options(annotations = [], commentId = "comment-42") {
  const comments = [];
  const github = {
    rest: { pulls: {
      get: async () => ({ data: { state: "open", head: { sha: "candidate-sha" } } }),
    }, issues: {
      updateComment: async comment => { comments.push(comment); return { data: { html_url: "https://github.test/comment" } }; },
      createComment: async comment => { comments.push(comment); return { data: { html_url: "https://github.test/comment" } }; },
    } },
  };
  return {
    github, comments, owner: "owner", repo: "repo", pullNumber: "113", commentId, commitSha: "candidate-sha",
    report: report(annotations), runURL: "https://github.test/run", artifactURL: "https://github.test/artifact",
    candidateURL: "https://candidate.test/", referenceURL: "https://reference.test/", baselineId: "snapshot-42",
  };
}

const difference = { type: "reference-difference", description: "Changed pixels: 500 (5%); limit 0.1%" };

test("review summary extracts advisory differences from nested suites without confusing pixel measurements", () => {
  const summary = summarizeReport(report([difference, { type: "pixel-difference", description: "500 pixels" }]));
  assert.equal(summary.differences.length, 1);
  assert.equal(summary.differences[0].project, "mobile");
  assert.deepEqual(summary.differences[0].categories, [difference.description]);
  assert.equal(summary.failures, 0);
});

test("review summary preserves functional failures and rejects missing or empty reports", () => {
  assert.equal(summarizeReport(report([difference], 1)).failures, 1);
  for (const invalid of [{}, { stats: {}, suites: [] }, {
    stats: { expected: 0, unexpected: 0, skipped: 0, flaky: 0 }, suites: [], errors: [],
  }]) assert.throws(() => summarizeReport(invalid));
});

test("different pages update the command comment in the PR conversation with report links", async () => {
  const input = options([difference]);
  const result = await publishReview(input);
  assert.equal(result.posted, true);
  assert.equal(input.comments.length, 1);
  const comment = input.comments[0];
  assert.equal(comment.comment_id, 42);
  assert.match(comment.body, /mobile/);
  assert.match(comment.body, /Changed pixels/);
  assert.match(comment.body, /https:\/\/github.test\/artifact/);
  assert.match(comment.body, /https:\/\/github.test\/run/);
  assert.match(comment.body, /snapshot-42/);
  assert.doesNotMatch(comment.body, /Resolve this conversation/);
  assert.match(comment.body, /functional or execution failures still fail/i);
  assert.match(comment.body, /\| Viewport \| Page\/check \| Differences \|\n\| --- \| --- \| --- \|\n\|/);
});

test("an unchanged comparison updates the command comment with a no-differences result", async () => {
  const input = options();
  const result = await publishReview(input);
  assert.equal(result.posted, true);
  assert.equal(input.comments.length, 1);
  assert.match(input.comments[0].body, /No reference differences found/);
});

test("functional failures remain visible even when reference differences are advisory", async () => {
  const input = options([difference]);
  input.report = report([difference], 1);
  const result = await publishReview(input);
  assert.equal(result.summary.failures, 1);
  assert.match(input.comments[0].body, /Functional\/execution failures: \*\*1\*\*/);
});

test("review publication rejects a stale commit or closed PR", async () => {
  for (const data of [
    { state: "open", head: { sha: "newer-sha" } },
    { state: "closed", head: { sha: "candidate-sha" } },
  ]) {
    const input = options([difference]);
    input.github.rest.pulls.get = async () => ({ data });
    await assert.rejects(() => publishReview(input), /open|head/i);
    assert.equal(input.comments.length, 0);
  }
});

test("review publication rejects invalid PR numbers and missing artifacts", async () => {
  for (const pullNumber of ["", "0", "-1", "113oops", "1.5"]) {
    await assert.rejects(() => validatePullRequest({ ...options(), pullNumber }), /PR number/);
  }
  await assert.rejects(() => publishReview({ ...options([difference]), artifactURL: "" }), /artifact/i);
});

test("review API failures are surfaced instead of returning a successful result", async () => {
  const input = options([difference]);
  input.github.rest.issues.updateComment = async () => { throw new Error("API permission denied"); };
  await assert.rejects(() => publishReview(input), /API permission denied/);
});

test("review body bounds long summaries and points to the complete report", () => {
  const input = options();
  const summary = summarizeReport(report());
  summary.differences = Array.from({ length: 200 }, (_, index) => ({
    title: `/page-${index}/`, project: "desktop", categories: [difference.description],
  }));
  const body = reviewBody({ ...input, summary });
  assert.ok(body.length < 60000);
  assert.match(body, /100 more.*report/i);
  const longBody = reviewBody({ ...input, baselineId: "x".repeat(100000), summary });
  assert.ok(longBody.length < 60000);
  assert.match(longBody, /truncated/);
});
