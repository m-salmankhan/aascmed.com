---
name: git-workflow
description: Use across agent harnesses for commits, pull/merge requests, and review follow-up in this repository; provide consistent defaults without enforcing message or review conventions.
---

# Git workflow for agent harnesses

Use this guidance across agent harnesses, including Codex, GitHub Copilot, and other coding agents. Use the repository's templates as defaults, not as validation rules. Preserve the user's wording when it is intentional and do not reject or rewrite a commit, pull request, or merge request solely because it does not match the templates.

## Merge authorization

Merging requires explicit, unambiguous user authorization for the specific PR/MR or clearly identified set of changes. Before merging, either obtain the user's final approval of the concrete, reviewable result (for example, "Merge MR !123 now"), or rely on an explicit instruction to merge that result without further approval (for example, "Implement this and merge without my approval"). A waiver applies only to its stated scope, not to other changes or future PRs/MRs. If the wording or scope is ambiguous, leave the PR/MR open and request final approval after preparing the result.

Never infer permission to merge or waive approval from task intent, urgency, successful checks, completed reviews, or broad autonomy instructions. "Drive this to completion", "Let's get this merged first", "get this ready to merge", and "merge when checks pass" do not waive final approval. Permission to implement, commit, push a feature branch, open/update a PR/MR, or address review comments does not authorize merging.

Without that authorization, finish the authorized implementation, validation, and review preparation, then present the specific PR/MR and validation results for approval. Do not execute the merge, enable auto-merge, enqueue a merge, or bypass this gate by integrating the changes into the target branch locally and pushing it. Apply the same gate to delegated agents and automations. Once explicit authorization exists, retain the normal required checks and branch protections; it is not permission to bypass them.

## Commit messages

When preparing a commit, suggest or start from `.gitmessage`, which is the single source of truth for the example format. The issue/Kaneo ID and link may be omitted when unavailable. Keep the summary concise, describe the actual changes, and record testing honestly and thoroughly enough to explain the methodology, scope, and result. A small change may have little testing; that is acceptable when stated plainly and left for the human reviewer to judge. Do not duplicate or restate the template in harness-specific instructions, and do not configure a global Git template or add hooks unless the user explicitly asks for that setup.

When a change is large or spans multiple concerns, prefer breaking it into individually reviewable commits with clear boundaries. Keep each commit coherent and understandable on its own where practical; do not split changes artificially when that would make the history harder to follow.

## Pull/merge requests

Use `.github/pull_request_template.md` as the default description shape. Treat “MR” and “PR” as the same review workflow unless the hosting service requires different mechanics. Keep the description concise, but give the reviewer full context for what the diff is intended to do, what approach was taken, and what they should expect to see. Describe testing honestly and thoroughly, including methodology and results; limited testing for a small or low-risk change is okay when clearly disclosed and left for the human reviewer to assess.

In GitLab MR descriptions and GitHub PR descriptions, format each known issue/Kaneo ticket as a Markdown hyperlink whose visible text is the ticket ID, for example `[ABC-123](https://tracker.example/tasks/ABC-123)`. Use the actual ticket URL; do not invent one. Do not show bare URLs, angle-bracket autolinks, or a separate raw "Link" field. If only a URL is known, use a concise ticket title or "Ticket" as the link text; if the URL is unavailable, show the ID alone. Before creating or updating the description, check that all known ticket URLs are behind readable link text.

## Automated review follow-up

If the repository or hosting service is configured to have an automated reviewer—such as GitHub Copilot—review the change, and the user asks to work through the review, use event-driven notifications, webhooks, or a platform-provided wait mechanism when available. If none is available, use only bounded, low-frequency checks when explicitly requested; do not run a continuous polling loop by default. Keep monitoring scoped to the current change and stop when the review is complete, the change is closed, a reasonable timeout or check limit is reached, or the user asks to stop. Stay quiet when there are no new comments.

For each new actionable review comment:

1. Inspect the referenced code and determine whether the comment is valid and in scope.
2. Apply a fix when appropriate, then run the smallest relevant validation.
3. Reply on the review thread with what changed and the validation result; explain briefly when a suggestion is not applicable.
4. Re-check for follow-up comments after pushing or updating the change.

This is advisory and opt-in: do not start monitoring merely because an automated reviewer exists or make unrelated changes. Review completion never grants merge authorization; follow the merge authorization gate above. Do not force-push or alter branch protection. Ask before taking an external action when the user's request did not already authorize it.
