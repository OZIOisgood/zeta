---
name: dashboard-ui
description: Use for Angular dashboard UI work, shared UI components, Angular Primitives/ng-primitives usage, Storybook stories, responsive layout, loading states, or frontend design planning in web/dashboard-next.
---

# Dashboard UI Workflow

## Discovery First

- Inspect nearby pages/components in `web/dashboard-next/src/app` before designing.
- Check reusable wrappers in `web/dashboard-next/src/app/shared/ui` before using raw primitives.
- Search current primitive usage with `rg "ng-primitives|Ngp|ngp" web/dashboard-next/src/app`.
- Check installed primitive docs/types before guessing APIs:
  - `web/dashboard-next/node_modules/ng-primitives/*/README.md`
  - `web/dashboard-next/node_modules/ng-primitives/*/index.d.ts`
- If local docs are missing or stale, use `.agents/references/llms.md` for Angular, Angular Primitives, and Storybook docs.

## Component Choices

- Prefer existing `z-*` components for buttons, icon buttons, dialogs, selects, comboboxes, tabs, checkboxes, skeletons, inputs, textareas, badges, breadcrumbs, toasts, and video previews.
- Use raw `ng-primitives` only when no wrapper exists or when extending a wrapper is the cleanest path.
- Keep wrappers accessible: keyboard interaction, focus handling, ARIA semantics, disabled states, and escape/outside-click behavior must come from primitives or established local patterns.
- Use lucide-angular icons for icon buttons and compact actions.

## UI Quality

- Async content areas use `z-skeleton` or established skeleton patterns. Avoid visible loading text for content placeholders.
- Include empty, error, disabled, permission-gated, and narrow-screen states when the workflow naturally needs them.
- Keep dashboard surfaces dense and operational: no marketing hero sections, decorative cards, or one-off visual systems.
- Preserve product terminology: UI says video; backend/API code may still say asset.

## Verification

- Run focused frontend tests when changing logic.
- Run `make web-next:lint` for frontend formatting/static checks.
- Run `make web-next:build` before completing frontend work.
- Run `make web-next:storybook:build` when adding or materially changing shared UI components/stories.
