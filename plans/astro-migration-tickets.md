# Astro migration ticket index

Approved 25 October 2026. Canonical design: [Astro migration plan](astro-migration-plan.md).

Kaneo workspace: AASCMed. Project: Website Development (WEB). All migration tickets are assigned to Salman Khan and start in To Do.

## Hierarchy and labels

Overall coordination epic: **WEB-11 — Migrate the website and editorial preview to Astro**.

The connected Kaneo API accepted an overall parent -> stage parent -> implementation task hierarchy. Epics here are ordinary parent tasks named Epic, not a separate native issue type. The board may display them as separate cards; parent/subtask links are the authoritative hierarchy.

Every migration item has the **Astro migration** label. Each stage parent and its implementation children also share a stage-specific label. Existing bugs WEB-8, WEB-9 and WEB-10 remain separate and are not tagged as migration work.

## Delegation and completion rules

1. Read the plan, ticket description, stage parent, and current incoming Kaneo Blocks relations before starting. This index is a creation-time snapshot; use current relations if the work has been deliberately re-planned.
2. Start only after **every blocker is Done and its changes are available in the working branch**. In Review is not complete. Check the actual branch rather than trusting status alone.
3. A stage parent is a completion gate: close it only when all children are Done, changes are integrated, and its exit criteria have evidence. Do not close parents just to unblock later work. The overall epic closes after all seven stages.
4. Independent siblings may proceed in parallel only when their own blockers are complete. Coordinate edits to shared files; a clear dependency graph does not remove merge-conflict risk.
5. Follow behavior contracts and the architecture proof, not stale implementation guesses. Document and correct a mistaken dependency or file hint explicitly rather than silently bypassing it or widening scope.
6. Deploy tasks require their validation prerequisites and retained rollback artifacts. The observation gate must include the agreed elapsed period and editor publishing cycle; it is not complete merely because deployment succeeded.

Kaneo Blocks/blocked-by relations record ordering. They should **not** be treated as hard status-transition enforcement: the published status-update handler does not check blocker completion. These explicit ticket rules supply the delegation guardrail; no workflow automation or server-side enforcement has been installed. Sources: [Kaneo dependency guide](https://kaneo.app/guides/task-dependencies), [status-update implementation](https://github.com/usekaneo/kaneo/blob/main/apps/api/src/task/controllers/update-task-status.ts).

## Stage epics

| Stage | Epic | Completion outcome | Blocked by |
| --- | --- | --- | --- |
| 0: Baseline and migration contracts | WEB-12 | Route/content/metadata baseline, performance budgets, framework-neutral regression checks, and deployment/rollback inventory are recorded. | None |
| 1: Architecture and styling proof | WEB-14 | A representative page works in static output and compiled Node SSR. Compatible versions, image boundary, hydration strategy and a clean Emotion/CSS decision are recorded without disrupting Gatsby. | WEB-12 |
| 2: Prepare reusable components in Gatsby | WEB-15 | Framework-independent contracts and React views are consumed by Gatsby without visual/behavioral regressions. Gatsby queries/types remain in adapters. Only justified compatibility styling changes are included. | WEB-14 |
| 3: Strapi loaders and Astro route parity | WEB-16 | All route families, media, metadata and interactions pass static/SSR parity checks. New draft URLs work without rebuilds; public output contains only published content. | WEB-15 |
| 4: Deploy and switch authenticated preview | WEB-17 | Compiled Astro SSR is validated on the real preview infrastructure, editors can review fresh drafts, and the preview proxy is switched with a tested Gatsby rollback retained. | WEB-16 |
| 5: Publish and cut over the public site | WEB-18 | Published-only Astro static artifacts are promoted atomically. Content webhooks, ordering, production smoke checks and rollback are verified without changing public URLs. | WEB-17 |
| 6: Observe and retire Gatsby | WEB-19 | The observation period and editor publishing cycle pass, rollback retention is documented, and obsolete Gatsby dependencies/services/refresh wiring are removed with clean-install verification. | WEB-18 |

## Implementation tasks

Every stage after stage 0 is gated by the preceding stage epic, including tasks with additional technical prerequisites. Dependencies below correspond to direct Blocks links, not merely prose suggestions.

### Stage 0: Baseline and migration contracts

Label: **Astro stage 0: Baseline**. Parent: **WEB-12**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-13 | Capture content, URL, deployment and preview performance baselines | None |
| WEB-20 | Make existing UI regression checks usable for Gatsby and Astro | WEB-13 |

### Stage 1: Architecture and styling proof

Label: **Astro stage 1: Architecture proof**. Parent: **WEB-14**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-21 | Add isolated Astro static and compiled SSR build targets | WEB-12, WEB-10 |
| WEB-22 | Prove React, Emotion, media and hydration fit Astro cleanly | WEB-12, WEB-21 |

### Stage 2: Prepare reusable components in Gatsby

Label: **Astro stage 2: Shared components**. Parent: **WEB-15**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-23 | Define shared content view models and URL contracts | WEB-14 |
| WEB-24 | Lift shared Gatsby queries into data adapters | WEB-14, WEB-23 |
| WEB-25 | Introduce framework-neutral navigation and environment configuration | WEB-14, WEB-23, WEB-8 |
| WEB-26 | Add neutral image descriptors while preserving existing media slots | WEB-14, WEB-23 |
| WEB-27 | Extract shared React views for fixed pages and archives | WEB-14, WEB-24, WEB-25, WEB-26 |
| WEB-28 | Extract shared React views for the five detail templates | WEB-14, WEB-24, WEB-25, WEB-26 |
| WEB-29 | Extract the homepage into a shared React view | WEB-14, WEB-27, WEB-28 |

### Stage 3: Strapi loaders and Astro route parity

Label: **Astro stage 3: Route migration**. Parent: **WEB-16**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-30 | Implement server-only Strapi 5 loaders and normalized mapping | WEB-15 |
| WEB-31 | Build Astro document, metadata and static asset integration | WEB-15 |
| WEB-32 | Migrate privacy, contact and 404 to thin Astro routes | WEB-15, WEB-30, WEB-31 |
| WEB-33 | Migrate blog, condition and provider archives and detail routes | WEB-15, WEB-32 |
| WEB-34 | Migrate clinic and dated service-update routes | WEB-15, WEB-33 |
| WEB-35 | Compose the Astro homepage from the shared React view | WEB-15, WEB-34 |
| WEB-36 | Extract and integrate public image and social-card generation | WEB-15 |
| WEB-37 | Verify and refine hydration for reusable interactive components | WEB-15, WEB-35 |
| WEB-38 | Validate full Astro static/SSR parity and content isolation | WEB-15, WEB-37, WEB-36 |

### Stage 4: Deploy and switch authenticated preview

Label: **Astro stage 4: Preview rollout**. Parent: **WEB-17**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-39 | Connect Strapi preview URLs and safe saved-draft refresh | WEB-16 |
| WEB-40 | Deploy a protected Astro SSR candidate beside Gatsby preview | WEB-16, WEB-9 |
| WEB-41 | Validate candidate preview security, freshness and reliability | WEB-16, WEB-39, WEB-40 |
| WEB-42 | Switch editorial preview to Astro with a retained Gatsby rollback | WEB-16, WEB-41 |

### Stage 5: Publish and cut over the public site

Label: **Astro stage 5: Public cutover**. Parent: **WEB-18**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-43 | Prepare atomic published-only Astro deployments and content webhooks | WEB-17 |
| WEB-44 | Promote Astro public output and verify production rollback | WEB-17, WEB-43 |

### Stage 6: Observe and retire Gatsby

Label: **Astro stage 6: Retirement**. Parent: **WEB-19**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-45 | Complete the post-cutover observation and rollback-retention gate | WEB-18 |
| WEB-46 | Remove obsolete Gatsby code and preview infrastructure after observation | WEB-18, WEB-45 |

## Starting work

**WEB-13** (capture baseline) is the first migration implementation task with no blockers. WEB-8, WEB-9 and WEB-10 can be handled independently at the same time. WEB-20 follows the baseline. Stage 1 opens when stage 0 is complete; scaffolding also consumes WEB-10's maintenance fixes.

The baseline/proof stages determine details such as actual hosting settings, compatible versions, performance budgets and the cleanest styling integration. Do not start wholesale style conversion or change public hosting architecture based only on a ticket title.

## Counts and maintenance links

- 1 overall coordination epic, 7 stage epics, 28 implementation tasks (36 migration items).
- 35 parent/subtask relations and 61 Blocks relations, including three dependencies on existing maintenance tickets.
- WEB-8 blocks WEB-25; WEB-9 blocks WEB-40; WEB-10 blocks WEB-21.
- The blocking graph was checked for cycles before creation. Recheck it when changing dependencies.

Ticket descriptions contain starting files, scope and acceptance checks. Keep this index updated if the approved delivery structure changes; keep detailed execution evidence in the relevant ticket or repository runbook.
