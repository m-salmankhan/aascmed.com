const assert = require("node:assert/strict");

function summarizeReport(report) {
  for (const key of ["expected", "unexpected", "skipped", "flaky"]) {
    assert.ok(Number.isInteger(report.stats?.[key]) && report.stats[key] >= 0, `Invalid Playwright stats: ${key}`);
  }
  assert.ok(report.stats.expected + report.stats.unexpected + report.stats.flaky > 0, "No tests executed");
  assert.ok(Array.isArray(report.suites) && Array.isArray(report.errors), "Invalid Playwright report");
  const differences = [];
  let tests = 0;
  const visit = suites => {
    for (const suite of suites) {
      for (const spec of suite.specs || []) {
        for (const test of spec.tests) {
          tests++;
          assert.ok(Array.isArray(test.annotations), "Missing test annotations");
          const categories = test.annotations.filter(annotation => annotation.type === "reference-difference")
            .map(annotation => annotation.description);
          if (categories.length) differences.push({ title: spec.title, project: test.projectName, categories });
        }
      }
      if (suite.suites) visit(suite.suites);
    }
  };
  visit(report.suites);
  const total = report.stats.expected + report.stats.unexpected + report.stats.skipped + report.stats.flaky;
  assert.equal(tests, total, "Report test inventory does not match stats");
  return {
    differences, total, failures: report.stats.unexpected + report.errors.length,
    skipped: report.stats.skipped, flaky: report.stats.flaky,
  };
}

function reviewBody({ summary, runURL, artifactURL, commitSha, candidateURL, referenceURL, baselineId }) {
  const code = value => {
    const text = String(value).replace(/[`|\r\n<>]/g, " ");
    return `\`${text.length > 1000 ? text.slice(0, 1000) + "... [truncated]" : text}\``;
  };
  const rows = [];
  let length = 0;
  for (const difference of summary.differences.slice(0, 100)) {
    const row = `| ${code(difference.project)} | ${code(difference.title)} | ${code(difference.categories.join("; "))} |`;
    if (length + row.length > 45000) break;
    rows.push(row);
    length += row.length;
  }
  const omitted = summary.differences.length - rows.length;
  return [
    "<!-- website-reference-review -->",
    "### Website regression check",
    summary.differences.length
      ? `Visual differences: **${summary.differences.length} page/viewport comparisons**. Functional/execution failures: **${summary.failures}**.`
      : `No reference differences found across ${summary.total} checks. Functional/execution failures: **${summary.failures}**.`,
    `Tests: ${summary.total}; skipped: ${summary.skipped}; flaky: ${summary.flaky}.`,
    "",
    `Commit: ${code(commitSha)}`,
    `Candidate: ${code(candidateURL)}`,
    `Reference: ${code(referenceURL)}`,
    `Baseline: ${code(baselineId)}`,
    "",
    `[CI run](${runURL}) | [Download full report and screenshots](${artifactURL}) (retained for 14 days)`,
    "The report includes reference/candidate screenshots, pixel differences where dimensions match, and contract JSON.",
    "",
    ...(rows.length ? ["| Viewport | Page/check | Differences |", "| --- | --- | --- |", ...rows] : ["No reference differences recorded."]),
    ...(omitted ? [`${omitted} more comparisons are listed in the complete report.`] : []),
    "",
    ...(summary.differences.length
      ? ["This comparison is advisory. Review the differences and decide whether they are expected; functional or execution failures still fail the CI job."]
      : ["Functional or execution failures still fail the CI job."]),
  ].join("\n");
}

async function validatePullRequest({ github, owner, repo, pullNumber, commitSha }) {
  assert.match(String(pullNumber), /^[1-9]\d*$/, "A positive PR number is required");
  const number = Number(pullNumber);
  assert.ok(Number.isSafeInteger(number), "Invalid PR number");
  const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: number });
  assert.equal(pr.state, "open", "The comparison PR must be open");
  assert.equal(pr.head.sha, commitSha, "The selected test-code commit must match the current PR head");
  return number;
}

async function publishReview(options) {
  const { github, owner, repo, commitSha, artifactURL, commentId } = options;
  assert.ok(artifactURL, "A report artifact URL is required");
  const summary = summarizeReport(options.report);
  const pullNumber = await validatePullRequest(options);
  const body = reviewBody({ ...options, summary });
  const { data: comment } = commentId
    ? await github.rest.issues.updateComment({ owner, repo, comment_id: Number(commentId), body })
    : await github.rest.issues.createComment({ owner, repo, issue_number: pullNumber, body });
  return { summary, body, posted: true, commentURL: comment.html_url };
}

module.exports = { summarizeReport, reviewBody, publishReview, validatePullRequest };
