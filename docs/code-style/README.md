# Code style

These rules apply to all code in this repository, whoever writes it, people or agents. The goal is code that a developer new to the project can read without asking what anything means.

Read this file first, then the guide for the language you're working in (listed at the end). Where a language guide is more specific, it wins. Where the existing code in a file already follows a different but consistent convention, follow the file and leave unrelated code alone; improve it only when you're already changing it.

## 1. Names say what the code does

Choose names so that someone reading the *call* understands it without opening the function. The name plus its parameters should tell you what goes in, what comes out and what happens.

Examples:

| Unclear | Clearer | Why |
| --- | --- | --- |
| `get(id)` | `getUserByEmail(email)` | says what is fetched and by what |
| `process(data)` | `resizeImageToWidth(image, width)` | says what actually happens |
| `rotate()` | `logOutAllUsers()` | describes the effect, not the mechanism |
| `flag` | `isExpired` | a boolean reads as a yes/no question |
| `data`, `info`, `item` | `clinicAddress`, `blogPost` | says what the value is |

- **One word, one meaning.** If a word could mean two different things in the same code (for example "key" as a database key *and* an encryption key), add a qualifier every time: `cacheKey`, `signingKey`.
- **Avoid abbreviations** unless they're universal (`id`, `url`, `html`).
- **Name things after what they are in the domain**, not after how they're stored or passed around.

## 2. Every function gets a small doc comment

Put a short doc comment on every function and method, private helpers included. Together with the name, it should leave no doubt about:

- what the function does, in one sentence
- what each parameter is
- what it returns
- how it can fail, and what that failure means to the caller

Use the documentation format of the language (see the language guides), so editors show it on hover and doc tools understand it.

Example (TypeScript):

```ts
/**
 * Finds the clinic whose page lives at the given URL path.
 *
 * @param slug - The last part of the clinic's page URL, e.g. "fairfax".
 * @returns The matching clinic, or `null` if no clinic uses that slug.
 * @throws If the CMS can't be reached. Callers show the error page.
 */
async function findClinicBySlug(slug: string): Promise<Clinic | null>
```

Describe the **contract** (what it does, its inputs, outputs and failures, and *why* when that isn't obvious), not the implementation line by line. A comment that says what the code does should still be true after someone rewrites the body.

## 3. Plain words, no invented jargon

Write comments, names, log messages, errors and docs in ordinary words that a developer new to the project would understand. Don't coin terms.

Examples:

| Avoid | Prefer |
| --- | --- |
| "Return the shared metadata key for this issuer." | "Redis key that stores which signing key is active." |
| "Redis key for a generation-qualified session identifier." | "Redis key that stores one login session." |
| "Hydrate the island payload." | "Load the JavaScript for this interactive component." |

**Project-specific concepts are not ideal, and should be a last resort.** Every new term is something every future reader has to learn before the code makes sense. First, try describing the thing in plain words where it's used. Only introduce a named concept when the plain description would be long *and* repeated in many places. When you do:

- **Define it once**, in ordinary words, where it's first introduced. For example: "generation: a random ID that changes whenever all sessions are revoked or the signing key changes. Every session ID starts with it, so changing it logs everyone out."
- **Use exactly that word everywhere afterwards**, never a synonym.
- **Don't build terms out of other invented terms** ("generation-qualified session identifier").

Standard terms from the language, framework or field (for example "hydration" in Astro, "idempotent" in Ansible, "JWT") are fine. They're documented elsewhere and a reader can look them up.

## 4. A long comment inside a function means "extract a method"

If a block inside a function needs a long comment to explain what it does, move it into its own function with a clear name and its own doc comment. The call site then explains itself.

Example:

```ts
// Before: the comment is doing the naming.
// Work out whether the clinic is open: closed on holidays, otherwise
// compare the current time with today's opening hours in the clinic's time zone...
if (/* 15 lines */) { ... }

// After: the name says it, and the doc comment on isClinicOpenNow explains the details.
if (isClinicOpenNow(clinic, now)) { ... }
```

Use judgement. Extract when the new function has a name that means something to a reader. Don't split code into many tiny helpers whose names are longer than their bodies. Short inline comments that explain *why* (a workaround, a non-obvious ordering, a security reason, a link to an issue) are fine and encouraged.

## 5. Describe the code that exists

Comments and docs describe the current code and how it behaves, not the history of how it was written.

- **No compatibility code for things that never shipped.** Don't keep old field names, "legacy formats", or "cleanup for servers that already have X" for anything that was never merged to `main` or deployed. Only add compatibility for state that really exists, on `main` or a running server, and say which.
- **No draft history in code or docs** ("replaces the earlier approach", "the original version"). That belongs in commit messages and PR descriptions.

## 6. Prefer the standard tool

Before writing a helper, check whether the language, the framework or an existing dependency already does it. Hand-written versions of standard things (parsers, retry loops, date handling, cookie handling) are extra code to read and extra places for bugs.

- Use the framework's or standard library's way first.
- Add a dependency only if it's widely used, maintained and appropriately licensed. Say why in the PR.
- Keep the design proportional to the problem. A small internal tool doesn't need the machinery of a large public service.

## 7. Tests

- A test's name says what should happen and when: `should show the closed notice when the clinic is closed today`.
- Arrange, act, assert: set up, do one thing, check the result.
- Test behaviour a user or caller can see, not internal details. Refactoring shouldn't break tests.
- Each test sets up its own data and doesn't depend on other tests or their order.
- Don't test the framework or third-party libraries; test our code.

## Language guides

The guides for the languages in this repository are listed below. [SOURCES.md](SOURCES.md) credits the material they adapt.

- [TypeScript](typescript.md)
- [React](react.md)
- [Astro](astro.md)
