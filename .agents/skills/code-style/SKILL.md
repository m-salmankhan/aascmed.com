---
name: code-style
description: Use whenever writing or changing code, comments or code documentation in this repository, across agent harnesses. Points to the repository's code style guide, the single source of truth for naming, doc comments, plain wording and language-specific conventions.
---

# Code style

The rules live in [`docs/code-style/`](../../../docs/code-style/README.md). This skill only says how to use them; don't copy rules from it into other files.

## Before writing code

1. Read `docs/code-style/README.md`. It's short and applies to every language.
2. Read the guide for each language you're about to change. They're listed at the end of the README.
3. Look at the file you're editing. Where it already follows a consistent convention, match it, and don't reformat unrelated code.

## The rules most often missed

These are reminders, not a replacement for the guide:

- **Every function gets a doc comment** in the language's own format, saying what it does, what each parameter is, what it returns and how it fails.
- **Plain words.** Don't invent terms. A project-specific concept is a last resort. If one is unavoidable, define it once in ordinary words and use exactly that word afterwards.
- **One word, one meaning.** Qualify ambiguous words ("key", "token", "id") every time.
- **A long explanatory comment inside a function means it should be a separate, well-named function.**
- **Describe the code that exists.** No compatibility code, old formats or draft history for anything that was never merged or deployed.
- **Prefer the standard tool.** Check the language, the framework and existing dependencies before writing a helper.

## When you finish

Re-read your diff against the guide, especially names, doc comments and wording, before committing.
