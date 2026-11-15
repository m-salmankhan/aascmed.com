# Astro

Read [the general rules](README.md) and [TypeScript](typescript.md) first. This site builds static pages with Astro and uses React components where a page needs interactivity. The editor preview runs the same code as a server-rendered app in draft mode.

## Server first, JavaScript only where it's needed

Astro renders every component to HTML on the server and sends **no JavaScript** for it unless asked. A React component only becomes interactive in the browser when the page adds a `client:*` directive. Astro calls each such component an *island*; the rest of the page stays plain HTML.

- **Use `.astro` components for anything that doesn't need to respond to the user in the browser**: layout, content, lists, static navigation. Use React only for parts that need it.
- **Every `client:*` directive is JavaScript that every visitor downloads and runs.** Add one only when the component really needs interactivity, and choose the lightest one that works:

| Directive | Loads the component's JavaScript | Use for |
| --- | --- | --- |
| `client:load` | immediately | things needed straight away, above the fold (menus, the header) |
| `client:idle` | when the browser is idle | interactive but not urgent |
| `client:visible` | when it scrolls into view | below-the-fold widgets, maps, carousels |
| `client:media="(max-width: 50em)"` | when a media query matches | things only needed on some screen sizes |
| `client:only="react"` | in the browser only, with no server HTML | components that can't render on the server at all (avoid where possible) |

  The site currently uses `client:load` everywhere. For new components, consider whether `client:idle` or `client:visible` would do; for existing ones, change the directive only when you're already working on that component and can check it still behaves correctly.
- **Pass islands only what they need.** Props passed to a `client:*` component are serialised into the page's HTML, so keep them small and never include anything private.

## Same output on the server and in the browser

A component with a `client:*` directive renders twice: once on the server, then again in the browser, where React takes over the server's HTML (Astro calls this *hydration*). If the two renders differ, React warns and the page can flicker or break.

- **Don't touch browser-only things during render** (`window`, `document`, `localStorage`, `navigator`). Use them in event handlers or effects, which only run in the browser.
- **Don't let the render depend on things that differ between server and browser**, such as the current time, random values or the visitor's time zone, unless the component handles the difference (for example by rendering a placeholder first).

## Content and data

- **Fetch CMS data in `.astro` files or `src/server/` code**, not inside React components. React components receive the data they display as props.
- **Use the shared loaders in `src/server/content/` (`loaders.ts`, `strapi.ts`) and the generated types** rather than calling the CMS directly. They handle draft mode, missing content and errors consistently; [src/server/content/README.md](../../src/server/content/README.md) explains how.
- **Keep secrets on the server.** Only variables prefixed `PUBLIC_` are allowed in browser code, and they're visible to everyone.
- **Pages render correctly when CMS content is missing or incomplete**, and drafts behave the same as published content apart from where they're read from.

## Checks

- Run `yarn typecheck` (`astro check`) for any `.astro`, `.ts` or `.tsx` change.
- Run the relevant `yarn test:unit`, `yarn test:astro` or `yarn test:infrastructure` suites. See [tests/README.md](../../tests/README.md) for the UI regression setup.
- Say in the PR which checks you ran and which you couldn't.
