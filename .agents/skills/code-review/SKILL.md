---
name: code-review
description: Use when reviewing a pull request, merge request, branch or diff in this repository, or when following up on review comments, across agent harnesses. Covers the review order, what to check, how to write comments and when to resolve them.
---

# Code review

Use this process when reviewing a change. The style rules it checks against live in [`docs/code-style/`](../../../docs/code-style/README.md); read the README and the guides for the languages in the diff before you start.

## 1. Understand the change first

- Read the PR description and any linked ticket, so you know what the change is *meant* to do.
- Read the whole diff before commenting. For a stacked PR, review only what this PR adds on top of its parent.
- Check the actual code rather than trusting the description, tests passing, or an earlier review.

## 2. Review in this order

Most important first. Don't let style comments bury a real bug.

1. **Correctness.** Does it do what it says? Check edge cases, failure paths (timeouts, missing data, outages), concurrency, and what happens on retry or restart.
2. **Security and privacy.** Secrets, authentication and authorisation, untrusted input (CMS, network, URL, forms), and what ends up in logs, error messages or the browser.
3. **Fit for purpose.**
   - Is there a standard tool, framework feature or existing helper that already does this?
   - Is the design proportional to the problem, or is it more machinery than this project needs?
   - Are new dependencies widely used, maintained and appropriately licensed?
4. **Readability**, against `docs/code-style/`:
   - names that don't say what the code does
   - missing or vague doc comments (purpose, parameters, return value, failures)
   - invented jargon or ambiguous words
   - long inline comments that should be separate functions
   - compatibility code or draft history for things that were never merged or deployed.
5. **Tests and checks.** Is the changed behaviour tested, including failure cases? Were the right checks run, and are any skipped ones stated?

## 3. Writing comments

- Put each comment on the line it's about, not in one big summary.
- Label the severity:
  - **[High]**: a bug, security problem or data loss; must be fixed before merging.
  - **[Med]**: a real risk or maintenance cost; should be fixed or explicitly accepted.
  - **[Low]**: an improvement; fine to defer.
- Say what's wrong, the concrete impact (what input or situation breaks it), and a suggested direction.
- **Ask for the smallest fix.** Rename, rewrite or delete before adding new mechanisms, options or validation. A review comment shouldn't make the code bigger than the problem.
- Say when you're unsure, and ask rather than assert.
- Link every ticket ID you mention, using its real URL (for Kaneo tickets, `[WEB-41](<task URL>)`), never a bare ID.

## 4. Following up

- When the author replies or pushes a fix, check the actual commit before resolving. Agreeing with the reply isn't enough.
- Resolve a thread only when the fix is verified, or the author's reasoning convinces you. Say which.
- If a fix introduces something new, raise it as a new comment rather than reopening the old one.
- Approving or completing a review never authorises merging; that needs the owner's explicit approval.
