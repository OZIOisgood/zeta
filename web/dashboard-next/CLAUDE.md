# CLAUDE.md — dashboard-next

Guidance for Claude Code when working in `web/dashboard-next`. These rules **override** the root `CLAUDE.md` frontend section (which still describes the old Taiga-based `web/dashboard`).

## What this app is

The new Angular dashboard for the phased UX/UI rewrite (see `instructions/tasks/20260516105903_dashboard_ux_ui_rewrite_plan/README.md`). It runs **beside** the old `web/dashboard` until deployment cutover. The old app is the behavioural reference only — do not copy its Taiga patterns here.

Stack:

- **Angular 21**, standalone components, signals (`input()`, `output()`, `computed()`, `signal()`).
- **Tailwind CSS v4** as the primary styling layer + design tokens in `src/styles.scss`.
- **ng-primitives** for unstyled accessible behaviour (`NgpButton`, `NgpDialog`, …).
- **Transloco** (`@jsverse/transloco`) for i18n — never hardcode user-facing strings.
- **NgRx Signal Store** (`@ngrx/signals`) for feature state.
- **@lucide/angular** for icons.
- **Storybook** (local-only) for component review.

Explicitly **not** used: Taiga UI, `ngx-translate`, `@angular/animations`, component-level signal facades. Do not add them.

## ⛔ The one rule that matters most: use the `z-*` component library

A shared UI library lives in `src/app/shared/ui/`. **Before building any UI, check it.** Do not hand-roll a `<button>`, `<input>`, dialog, tabs, etc. when a `z-*` component exists — and one almost always does.

Workflow for any UI work:

1. **Look first:** `Glob "src/app/shared/ui/**/*.component.ts"` or grep for the selector. The inventory below is the index.
2. **Reuse:** import the component and use its `z-*` selector.
3. **Read its API:** open the component file (and its `.stories.ts`) for the real inputs/outputs before using it. Do not guess prop names.
4. **Missing something?** If no `z-*` component fits, **stop and ask the user** before creating a new shared primitive or styling raw HTML. New primitives go in `shared/ui/`, follow the conventions below, and need a Storybook story — they are not invented inline inside a page.

Naming: selector `z-<name>`, class `Z<Name>Component`, folder `shared/ui/<name>/`. There is no barrel file — import by direct path, e.g.
`import { ZButtonComponent } from '../../shared/ui/button/z-button.component';`

## Component inventory (`src/app/shared/ui/`)

Verify the exact inputs/outputs in each file before use; this table is a discovery index, not an API spec.

| Selector                 | Component                           | Use for                                                                                                                                                 |
| ------------------------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `z-button`               | ZButtonComponent                    | Buttons. Inputs: `variant` (`primary`/`secondary`/`ghost`/`danger`), `size` (`sm`/`md`), `type`, `disabled`, `iconOnly`, `ariaLabel`; output `pressed`. |
| `z-icon-button`          | ZIconButtonComponent                | Icon-only actions.                                                                                                                                      |
| `z-text-input`           | ZTextInputComponent                 | Text/email/password/date/number/… input. `ControlValueAccessor` — use with reactive forms.                                                              |
| `z-textarea`             | ZTextareaComponent                  | Multi-line input (CVA).                                                                                                                                 |
| `z-checkbox`             | ZCheckboxComponent                  | Checkbox (CVA).                                                                                                                                         |
| `z-select`               | ZSelectComponent                    | Single-choice native-style select (CVA).                                                                                                                |
| `z-combobox`             | ZComboboxComponent                  | Searchable/filterable dropdown (CVA). Also exports `[zComboboxPositionedDropdown]` directive.                                                           |
| `z-field-label`          | ZFieldLabelComponent                | Form field label.                                                                                                                                       |
| `z-field-error`          | ZFieldErrorComponent                | Validation error text under a field.                                                                                                                    |
| `z-avatar`               | ZAvatarComponent                    | Display a user/group avatar.                                                                                                                            |
| `z-avatar-input`         | ZAvatarInputComponent               | Pick/upload an avatar.                                                                                                                                  |
| `z-badge`                | ZBadgeComponent                     | Status pill / count badge.                                                                                                                              |
| `z-breadcrumbs`          | ZBreadcrumbsComponent               | Breadcrumb navigation.                                                                                                                                  |
| `z-tabs` / `z-tab-panel` | ZTabsComponent / ZTabPanelComponent | Tabbed sections.                                                                                                                                        |
| `z-segmented-control`    | ZSegmentedControlComponent          | Segmented toggle between a few options.                                                                                                                 |
| `z-stepper`              | ZStepperComponent                   | Multi-step flow progress (e.g. upload, booking).                                                                                                        |
| `z-dialog-panel`         | ZDialogPanelComponent               | Generic dialog panel with severity icon (info/warning/trash).                                                                                           |
| `z-form-dialog`          | ZFormDialogComponent                | Modal with cancel/save footer. Input `title` (required); outputs `cancelled`, `saved`.                                                                  |
| `z-toast`                | ZToastComponent                     | Toast notification surface.                                                                                                                             |
| `z-skeleton`             | ZSkeletonComponent                  | Loading placeholder.                                                                                                                                    |
| `z-empty-state`          | ZEmptyStateComponent                | Empty/zero-data state.                                                                                                                                  |
| `z-group-card`           | ZGroupCardComponent                 | Domain card for a group.                                                                                                                                |
| `z-video-preview`        | ZVideoPreviewComponent              | Domain video thumbnail/preview.                                                                                                                         |

## Styling conventions

- **Tailwind utilities first.** Reach for SCSS only for tokens, keyframe animations, and primitive state selectors.
- **Use the design tokens**, never raw hex. Tokens are CSS variables defined in `src/styles.scss`: `var(--z-bg)`, `--z-surface`, `--z-surface-warm`, `--z-surface-muted`, `--z-text`, `--z-muted`, `--z-primary`, `--z-primary-strong`, `--z-primary-soft`, `--z-accent`, `--z-border`, `--z-success`, `--z-warning`, `--z-danger`. In Tailwind: `bg-[var(--z-primary)]`, `text-[var(--z-muted)]`, etc.
- **Default radius** 6–8px (`rounded-md`/`rounded-lg`). Avoid heavily rounded, card-heavy styling.
- **Mobile-first.** Base styles target mobile; layer `sm:`/`md:` up.
- **Motion:** use Angular `animate.enter` / `animate.leave` with the predefined keyframe classes in `src/styles.scss` (`z-fade-*`, `z-drawer-*`, `z-list-*`, `z-pop-*`, `z-toast-*`). Do not add `@angular/animations`. Respect the existing `prefers-reduced-motion` block.

## Architecture conventions

- **Feature state → NgRx Signal Store.** Stores live in `src/app/features/<feature>/<feature>.store.ts` using `signalStore` + `withState`/`withComputed`/`withMethods`. Use the shared `AsyncSlice` helpers in `core/state/async-state.ts` (`idleAsyncSlice`, `loadingAsyncSlice`, `successAsyncSlice`, `errorAsyncSlice`) for loading/error status. Do not wrap services in component-level signal facades.
- **HTTP** goes through API clients in `core/http/*-api.service.ts`. Stores orchestrate; services fetch.
- **Cross-cutting** (shell, guards, i18n, permissions, calls, session/app-shell stores) lives under `core/`.
- **Pages** under `features/` and `pages/` compose `z-*` components + a store. Mirror existing pages.
- **i18n:** every user-facing string uses Transloco (`| transloco` pipe or `TranslocoService`). Product terminology rule still applies — say **video** in UI copy; keep `asset`/`video` as-is in API/types.

## Verifying work

Run from repo root (or `pnpm` from this dir):

```bash
make web-next:build      # must pass before marking UI work complete
make web-next:test       # Vitest + jsdom
make web-next:storybook:build
```

New/changed shared primitives need a `.stories.ts`. Add targeted tests for stores, permission-sensitive UI, and key workflows — not full coverage.
