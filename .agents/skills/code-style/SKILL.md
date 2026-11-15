---
name: code-style
description: Use when writing, changing or reviewing code in this repository, across agent harnesses. Covers naming, doc comments, plain wording, and when to extract a method.
---

# Code style for agent harnesses

These rules apply to every language in this repository. The goal is code that a developer new to the project can read without asking what anything means.

## 1. Names carry the intent

Name each function, method and variable so the call site reads clearly without opening the definition. The name and signature together should say what goes in, what comes out and what happens.

- Prefer `session_redis_key(session_id)` to `key(id)`, and `revoke_all_sessions()` to `rotate()`.
- Don't use one word for two things. If "key" could mean a Redis key or a signing key, qualify it every time (`signing_key`, `session_redis_key`).
- Booleans read as yes/no questions: `is_expired`, `should_touch`.

## 2. Every function gets a small doc comment

Put a short doc comment on every function and method, private helpers included. It should remove any doubt about:

- what the function does, in one sentence
- each parameter
- what it returns
- how it fails, and what that failure means to the caller (for example: "returns `Err` if Redis doesn't answer within one second; callers turn that into a 503")

Use the language's own documentation format, so editors and doc tools understand it:

| Language | Format |
| --- | --- |
| Rust | `///` rustdoc with `# Arguments`, `# Returns`, `# Errors` (and `# Panics` where relevant) |
| TypeScript / JavaScript | JSDoc `/** ... */` with `@param`, `@returns`, `@throws` |
| Python | Docstrings with `Args:`, `Returns:`, `Raises:` |
| Ansible | The task `name:` is the doc: a plain sentence saying what the task makes true |

Describe the contract (what it does, its inputs and outputs, and *why* if that isn't obvious), not the implementation line by line. That keeps comments true when the body changes.

```rust
/// Builds the Redis key that stores one preview session.
///
/// # Arguments
/// * `session_id` - The session ID from the browser's cookie.
///
/// # Returns
/// The Redis key, in the form `preview-auth:<site>:session:<session_id>`.
fn session_redis_key(&self, session_id: &str) -> String
```

## 3. Plain words, no invented jargon

Write comments, names, log messages and docs in ordinary words. Don't coin terms.

- Bad: "Return the shared metadata key for this issuer." / "Redis key for a generation-qualified session identifier."
- Good: "Redis key holding the active signing key's fingerprint and the current log-everyone-out ID."

**Project-specific concepts are a last resort.** A new term is a cost: every future reader has to learn it before the code makes sense. First try to describe the thing in plain words where it's used. Only introduce a named concept when the plain description would be long and repeated in many places. If you do introduce one:

- define it once, in ordinary words, where it's first introduced (for example: "generation: a random ID that changes whenever all sessions are revoked or the signing key changes; every session ID starts with it, so changing it logs everyone out")
- use exactly that word everywhere afterwards, never a synonym
- don't stack invented terms on top of each other ("generation-qualified session identifier")

## 4. A long comment inside a function means "extract a method"

If a block inside a function needs a long comment to explain what it does, move it into its own method with a clear name and its own doc comment. The call site then reads as the explanation.

Use judgement: extract when the new method has a name that means something to a reader. Don't split code into many tiny helpers whose names are longer than their bodies. Short inline comments that explain *why* (a workaround, a non-obvious ordering, a security reason) are fine and encouraged.

## 5. Describe the code that exists

Comments and docs describe the current code and its runtime behaviour, not the history of how it was written.

- No "compatibility" code, "legacy formats", renamed-for-old-records fields or "cleanup for hosts that already have X" for anything that was never merged or deployed. Only add compatibility for state that really exists on `main` or a running host, and say which.
- Don't narrate replaced drafts ("replaces the earlier Lua dispatcher", "the original snapshot"). That belongs in commit messages and PR descriptions.

## Reviewing

When reviewing, treat these as readability defects worth a comment: invented or ambiguous terms, missing parameter/return/error docs, long explanatory comments that should be methods, and compatibility code for things that don't exist. Ask for minimal fixes: rewrite and rename, don't add new mechanisms.
