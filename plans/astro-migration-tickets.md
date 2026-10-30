# Astro migration ticket index

Approved 25 October 2026; reordered 30 October 2026. Canonical designs: [Astro migration plan](astro-migration-plan.md) and [deferred preview platform plan](preview-platform-plan.md).

Kaneo workspace: AASCMed. Project: Website Development (WEB). Check current assignments and status on the board; historical creation-time statuses are not authoritative.

## Hierarchy and labels

Overall coordination epic: **WEB-11 — Migrate the website and editorial preview to Astro**.

The connected Kaneo API accepted an overall parent -> stage parent -> implementation task hierarchy. Epics here are ordinary parent tasks named Epic, not a separate native issue type. The board may display them as separate cards; parent/subtask links are the authoritative hierarchy.

Every migration item has the **Astro migration** label. Each stage parent and its implementation children also share a stage-specific label. Existing bugs WEB-8, WEB-9 and WEB-10 remain separate and are not tagged as migration work.

## Delegation and completion rules

1. Read the plan, ticket description, stage parent, and current incoming Kaneo Blocks relations before starting. This index is a creation-time snapshot; use current relations if the work has been deliberately re-planned.
2. Start only after **every blocker is Done and its changes are available in the working branch**. In Review is not complete. Check the actual branch rather than trusting status alone.
3. A stage parent is a completion gate: close it only when all children are Done, changes are integrated, and its exit criteria have evidence. Do not close parents just to unblock later work. The overall epic closes when the public migration, retirement and deferred preview gates are complete.
4. Independent siblings may proceed in parallel only when their own blockers are complete. Coordinate edits to shared files; a clear dependency graph does not remove merge-conflict risk.
5. Follow behavior contracts and the architecture proof, not stale implementation guesses. Document and correct a mistaken dependency or file hint explicitly rather than silently bypassing it or widening scope.
6. Deploy tasks require their validation prerequisites and retained rollback artifacts. The public observation gate must include the agreed elapsed period and editor publishing cycle; it is not complete merely because deployment succeeded. Preview may be offline during retirement and does not block public cutover or WEB-46.

Kaneo Blocks/blocked-by relations record ordering. They should **not** be treated as hard status-transition enforcement: the published status-update handler does not check blocker completion. These explicit ticket rules supply the delegation guardrail; no workflow automation or server-side enforcement has been installed. Sources: [Kaneo dependency guide](https://kaneo.app/guides/task-dependencies), [status-update implementation](https://github.com/usekaneo/kaneo/blob/main/apps/api/src/task/controllers/update-task-status.ts).

## Stage epics

| Stage | Epic | Completion outcome | Blocked by |
| --- | --- | --- | --- |
| 0: Baseline and migration contracts | WEB-12 | Route/content/metadata baseline, performance budgets, framework-neutral regression checks, and deployment/rollback inventory are recorded. | None |
| 1: Architecture and styling proof | WEB-14 | A representative page works in static output and compiled Node SSR. Compatible versions, image boundary, hydration strategy and a clean Emotion/CSS decision are recorded without disrupting Gatsby. | WEB-12 |
| 2: Prepare reusable components in Gatsby | WEB-15 | Framework-independent contracts and React views are consumed by Gatsby without visual/behavioral regressions. Gatsby queries/types remain in adapters. Only justified compatibility styling changes are included. | WEB-14 |
| 3: Strapi loaders and Astro route parity | WEB-16 | All route families, media, metadata and interactions pass static/SSR parity checks. New draft URLs work without rebuilds; public output contains only published content. | WEB-15 |
| 4: Deferred new preview platform | WEB-17 | After WEB-46, provision and validate the new Traefik/Podman/Ansible preview with separate preview authentication; editors can review fresh drafts and recovery is exercised. | WEB-46 |
| 5: Publish and cut over the public site | WEB-18 | Published-only Astro static artifacts are promoted atomically. Content webhooks, ordering, production smoke checks and rollback are verified without changing public URLs. | WEB-16 |
| 6: Observe and retire Gatsby | WEB-19 | The observation period, editor publishing cycle and WEB-50 prerequisite pass; obsolete Gatsby dependencies and refresh wiring are removed with clean-install verification. | WEB-18 |

## Implementation tasks

The stages retain their historical labels, but are no longer executed in numerical order: public cutover and retirement precede the deferred preview. Dependencies below summarize the revised plan; confirm direct Blocks links and current card descriptions on the board before starting.

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

### Stage 4: Deferred new preview platform

Label: **Astro stage 4: Preview rollout**. Parent: **WEB-17**. These tasks are deferred until Gatsby retirement; the former parallel-Gatsby and Cloudflare Access/Tunnel proposals are superseded. See [the preview platform plan](preview-platform-plan.md) for repository ownership, design and acceptance criteria.

| Ticket | Work | Prerequisite |
| --- | --- | --- |
| WEB-51 | Establish deferred preview repository and reconcile closed migration work | WEB-46 |
| WEB-39 | Connect Strapi preview URLs and safe saved-draft refresh | WEB-46, WEB-51 |
| WEB-40 | Prepare the compiled Astro preview image and deployment integration | WEB-46, WEB-51 |
| WEB-52 | Implement Strapi-backed login and independent preview JWT sessions | WEB-46, WEB-51 |
| WEB-53 | Publish private auth image and pin release digests | WEB-46, WEB-40, WEB-52 |
| WEB-54 | Automate new VPS with Ansible, Traefik and Podman Quadlets | WEB-46, WEB-51 |
| WEB-55 | Write beginner VPS setup, deployment and recovery guide | WEB-46, WEB-53, WEB-54 |
| WEB-41 | Validate new preview security, freshness and reliability on the actual host | WEB-46, WEB-39, WEB-40, WEB-53, WEB-54, WEB-55 |
| WEB-42 | Complete editor acceptance and tested recovery for the new preview | WEB-46, WEB-41 |

### Stage 5: Publish and cut over the public site

Label: **Astro stage 5: Public cutover**. Parent: **WEB-18**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-43 | Prepare atomic published-only Astro deployments and content webhooks | WEB-16 |
| WEB-44 | Promote Astro public output and verify production rollback | WEB-16, WEB-43 |

### Stage 6: Observe and retire Gatsby

Label: **Astro stage 6: Retirement**. Parent: **WEB-19**.

| Ticket | Work | Direct blockers |
| --- | --- | --- |
| WEB-45 | Complete the post-cutover observation and rollback-retention gate | WEB-18 |
| WEB-50 | Complete the existing island prerequisite for Gatsby retirement | Check current board relations |
| WEB-46 | Remove obsolete Gatsby code and preview infrastructure after observation | WEB-18, WEB-45, WEB-50 |

## Starting work

WEB-16 is complete. Proceed with the published-only public deployment work WEB-43 and WEB-44, then the observation gate WEB-45 and the existing WEB-50 island prerequisite, then WEB-46 retirement. The new WEB-17 preview work follows WEB-46; **WEB-46 must not depend on WEB-17**, or the sequence becomes cyclic. Preserve public publish webhooks and public rollback artifacts when retiring Gatsby; inventory legacy source, dependencies, generated outputs and preview refresh wiring before removal.

The earlier website MRs #156, #157 and #158 and CMS MR #25 were closed without merge. Their branches remain available for selective reuse; they do not establish a deployed preview or integrated implementation. See [the preview platform plan](preview-platform-plan.md) for relevant commit references and the superseded Access proposal.

## Maintenance links

The earlier creation-time task and dependency counts are superseded by the replan. Check the live board and direct Blocks relations before work, and recheck the graph for cycles when updating it.

Ticket descriptions contain starting files, scope and acceptance checks. Keep this index updated if the approved delivery structure changes; keep detailed execution evidence in the relevant ticket or repository runbook.
