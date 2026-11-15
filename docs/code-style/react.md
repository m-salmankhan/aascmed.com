# React

Read [the general rules](README.md) and [TypeScript](typescript.md) first. React components and hooks are functions, so the function rules apply to them too. This site uses React 18 components inside Astro pages; see [Astro](astro.md) for how they're rendered and loaded.

## Components

- **Write ordinary function components with a typed props object.** New code doesn't need `React.FC` or `React.FunctionComponent`, but don't rewrite existing components just to remove it.

  ```tsx
  import type { ReactNode } from "react";

  /** Props for {@link Notice}. */
  export interface NoticeProps {
    /** Short text read out by screen readers to describe the notice. */
    label: string;
    /** The notice's content. */
    children: ReactNode;
  }

  /**
   * Shows a highlighted notice, e.g. a service update.
   *
   * @param props - See {@link NoticeProps}.
   */
  export function Notice({ label, children }: NoticeProps) {
    return <section aria-label={label}>{children}</section>;
  }
  ```

- **Document each prop** with a short comment on the props type, so it shows on hover where the component is used.
- **Name things consistently:**
  - components are `PascalCase`, and their props type is `ComponentNameProps`
  - callback props start with `on` (`onSelect`), and the functions that handle them start with `handle` (`handleSelect`)
  - custom hooks start with `use`.
- **Pass only what a child needs**, not a whole object "just in case". It makes the dependency clear and avoids unnecessary re-renders.
- **Prefer composition (`children`, or passing components in as props) over growing a component with more and more boolean props.** Five booleans means up to 32 combinations to support. If components only make sense together (tabs, accordions, menus), group them as related components rather than one large configurable one.
- **Don't copy props into state.** State initialised from a prop won't update when the prop changes. If a prop really is only a starting value, name it `initialX`.

## Rendering must be pure

React may render a component more than once, and at any time. During rendering, a component must not:

- change anything outside itself (globals, the DOM, props, objects passed in)
- read the time, random numbers or browser-only values in a way that changes the output between server and client renders (see [Astro](astro.md))
- start requests or other side effects.

Do side effects in event handlers, or in effects when they synchronise with something outside React.

## State and effects

- **Keep state minimal.** If a value can be calculated from props or other state, calculate it during render instead of storing it.

  ```tsx
  // Avoid: a second piece of state kept in sync by an effect
  const [fullName, setFullName] = useState("");
  useEffect(() => setFullName(`${first} ${last}`), [first, last]);

  // Prefer: calculate it during render
  const fullName = `${first} ${last}`;
  ```

- **You often don't need an effect.** Use one only to synchronise with something outside React (a map library, a browser API, a subscription). Don't use effects to:
  - transform data for display: calculate it during render
  - respond to a user action: do it in the event handler
  - reset state when a prop changes: pass a `key` instead.
- **When you do use an effect,** list every dependency (the lint rule catches missing ones) and return a cleanup function if it subscribes, starts a timer or adds a listener.
- **Follow the rules of hooks:** call hooks only at the top level of a component or custom hook, never inside conditions or loops.
- **Use stable, meaningful `key`s** for lists (an ID, not the array index) when items can be reordered, added or removed.
- **Don't add `useMemo`, `useCallback` or `React.memo` by default.** Add them when there's a measured slowness or a real need for a stable reference, and say which in a comment.

## Accessibility

- Use the right HTML element first (`button` for actions, `a` for navigation, headings in order, lists for lists) before reaching for ARIA attributes.
- Every interactive control works with a keyboard and has an accessible name.
- Images have useful `alt` text, or `alt=""` if they're purely decorative.
- Check the loading, empty and error states, and narrow screens, not just the happy path.

## Content from the CMS

- **Render CMS text as text.** Rich text arrives as structured Strapi Blocks; render it through `src/components/strapi/blocks-renderer.tsx`, which also copes with malformed content. Don't render CMS strings as HTML.
- **`dangerouslySetInnerHTML` (and `set:html` in `.astro`) is for JSON-LD only.** When you put JSON into a `<script>` tag, escape `<` so CMS text can't close the tag early (see `src/views/clinic.tsx`).
- **Expect CMS fields to be missing or empty**, and render something sensible when they are.
