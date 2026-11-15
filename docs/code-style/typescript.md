# TypeScript

Read [the general rules](README.md) first. This file adds the TypeScript-specific ones. Where the TypeScript compiler, `astro check` or a linter already enforces something, let the tool do it rather than reviewing by hand.

## Doc comments

Use TSDoc/JSDoc block comments (`/** ... */`) on every function, method, exported type and component, including private helpers.

- `@param name - description` for each parameter.
- `@returns` for what comes back, including what `null` or `undefined` means.
- `@throws` for errors the caller should expect, and what the caller does about them.
- Don't repeat the types: TypeScript already shows them. Say what the values *mean*.

```ts
/**
 * Formats a clinic's opening hours for display on its page.
 *
 * @param hours - The clinic's weekly hours from the CMS.
 * @param day - The day to show, e.g. "monday".
 * @returns Text like "8:00 AM – 5:00 PM", or "Closed" if the clinic isn't open that day.
 */
export function formatOpeningHours(hours: WeeklyHours, day: Weekday): string
```

## Types

- **Let TypeScript infer obvious local values.** Declare types at boundaries, where they document a contract: exported functions, component props, and data coming from the CMS or the network.
- **Keep types as narrow as the data really is.** Use literal unions (`"draft" | "published"`) instead of `string` when only some values are valid.
- **Model "one of several states" with a discriminated union, not a set of booleans.** Booleans like `isLoading`, `isError` and `isEmpty` can be combined into states that make no sense.

  ```ts
  type ClinicSearch =
    | { status: "loading" }
    | { status: "failed"; error: string }
    | { status: "found"; clinics: Clinic[] };
  ```

- **Prefer literal unions or `as const` objects over `enum`.** Enums generate extra runtime code and have surprising edge cases.
- **Use `as const satisfies SomeType`** for constant tables that must keep their exact values *and* match a shape.
- **`type` and `interface` are both fine.** This codebase uses both. Follow the file you're in; use `interface` when you need to extend or merge declarations.
- **Mark data that shouldn't change as `readonly`** (`readonly string[]`, `Readonly<T>`), and return new objects or arrays rather than mutating inputs.
- **Use `import type`** for imports that are only types.

## Unknown and unsafe data

- **Don't use `any`.** It switches type checking off and hides bugs. Existing `any` in the codebase is technical debt, so don't add more.
- **Treat CMS, network, URL and form data as `unknown`** until it has been checked, then narrow it. Use the generated Strapi types in `src/server/content/generated/` (regenerate with `yarn strapi:types`) rather than writing the shapes by hand.
- **Avoid type assertions (`value as User`) and non-null assertions (`value!`).** They only silence the compiler. When one is truly needed, for example because a library's types are wrong, add a short comment saying why it's safe.
- **If a type error can't be fixed, use `// @ts-expect-error <reason>`**, never `@ts-ignore`. `@ts-expect-error` tells you when the error goes away, so it doesn't linger.
- **Handle `null` and `undefined` deliberately.** Use `null` for "intentionally empty" and `undefined` for "not provided", and handle both where the CMS can leave fields blank.

## Functions

- **One job per function.** Pass in what it needs rather than reading from outer state.
- **Keep calculations separate from side effects.** Pure functions (same input, same output, no side effects) are easy to test and reuse. Keep the parts that fetch, write or log small, and keep business logic out of them.
- **Use an options object when a function takes several related arguments**, so call sites read clearly:

  ```ts
  // Unclear at the call site
  buildImageUrl(src, 800, 600, true, "webp");
  // Clear
  buildImageUrl({ src, width: 800, height: 600, crop: true, format: "webp" });
  ```

  Keep positional arguments when the meaning is obvious (`isNumber(value)`, callbacks).
- **Most arguments should be required.** Lots of optional arguments usually means the function is doing too much and should be split.
- **Exported functions declare their return type.** Internal helpers can rely on inference.

## Naming

- `camelCase` for variables and functions, `PascalCase` for types and components, `UPPER_SNAKE_CASE` for true constants.
- Booleans start with `is`, `has`, `should` or `can`.
- Prefer **named exports** over default exports, so names stay the same everywhere they're imported. (Astro pages and config files that must use a default export are the exception.)
- Treat acronyms as words: `getHtmlTitle`, `cmsUrl`, not `getHTMLTitle`.
- Use descriptive generic names when there's more than one, or when the meaning isn't obvious: `TItem`, `TResponse`. A single obvious `T` is fine.
