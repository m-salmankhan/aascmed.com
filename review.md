# Code review guide

Use this guide when reviewing changes to the website. Apply it to new and changed code; improve legacy code when it is in scope rather than requiring unrelated rewrites. Prioritize correctness, accessibility, security, and maintainability over stylistic preferences.

## TypeScript

- Prefer type inference for obvious local values. Add explicit types at boundaries where they clarify a contract, especially public APIs and data from the CMS or network.
- Use descriptive type aliases for complex object shapes, unions, intersections, and repeated function signatures. Keep simple one-off types inline when they remain readable. Use interfaces when extension or declaration merging is needed.
- Model finite states with literal unions or discriminated unions. Handle nullable and optional values explicitly; avoid non-null assertions unless the invariant is established and documented.
- Avoid `any` and unchecked type assertions. Treat external data as `unknown` and validate or narrow it before use. Use `import type` for type-only imports.
- Keep types close to their consumers, share them when they represent a shared contract, and avoid duplicating generated or existing types.
- Add meaningful JSDoc to every exported method, function, and type, including exported component functions and props types. Describe purpose, important parameters, return values, side effects, and constraints where relevant; do not merely repeat the signature. Keep comments current when behavior changes.

## React

- Prefer ordinary function components with typed props over `React.FC` or `React.FunctionComponent`. Declare `children` explicitly when supported; rely on return type inference unless an explicit return type improves the contract.

  ```tsx
  import type { ReactNode } from "react";

  /** Content and label displayed by a notice. */
  export type NoticeProps = {
    label: string;
    children: ReactNode;
  };

  /** Displays a labeled notice. */
  export function Notice({ label, children }: NoticeProps) {
    return <section aria-label={label}>{children}</section>;
  }
  ```

- Keep rendering pure and state minimal. Derive values during render when possible; use effects to synchronize with external systems, with complete dependencies and cleanup where needed.
- Follow the Rules of Hooks. Use stable, meaningful keys for lists, and avoid mutating props or state.
- Use semantic HTML, accessible names, keyboard-operable controls, and appropriate alt text. Check loading, empty, error, and responsive states when relevant.
- Consider server rendering and hydration: avoid accessing browser globals during server rendering and keep initial output consistent. Use memoization only when it addresses a demonstrated need.

## Review and verification

- Check behavior and edge cases, including CMS content that is missing or malformed, and preserve existing public routes and content contracts unless the change intentionally updates them.
- Review external links, user input, secrets, and error handling. Do not expose sensitive configuration or render untrusted content without appropriate handling.
- Add or update focused tests for behavior that changed. Run `yarn typecheck` and the relevant unit, infrastructure, or UI tests; see [the testing guide](tests/README.md) for UI regression setup. State any checks that could not be run in the pull request.
- Give actionable feedback with the impact and suggested direction. Distinguish blocking correctness issues from optional improvements.
