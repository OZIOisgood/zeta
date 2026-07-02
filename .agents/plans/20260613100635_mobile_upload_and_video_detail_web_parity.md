# Mobile Upload + Video-Detail Web Parity

## Context

The mobile `upload` and `asset/[id]` screens diverge from their web counterparts in
**structure and component set** ("different UI elements, different arrangement"),
even though the design tokens already match (colors are correct). Root cause: both
screens were built as ad-hoc simplified forms instead of mirroring the web layout.
Mobile has only 7 `z-*` primitives vs ~22 on web and is missing the ones the web
screens use (`badge`, `field-label`, `field-error`, `empty-state`, `stepper`,
`select`, `avatar`) plus the card/section pattern.

Per `mobile/AGENTS.md`, `web/dashboard-next` is the design reference. **Goal:** both
screens mirror the web **mobile-width** rendering — single-column, stacked section
cards, same elements and hierarchy — adapted to native interaction where the web
pattern does not translate (file picker vs drag-and-drop; modal list vs hover
dropdown).

Web references: `web/dashboard-next/src/app/pages/upload-video/upload-video-page.component.ts`,
`.../pages/video-details/video-details-page.component.ts`, and the `z-*` wrappers in
`web/dashboard-next/src/app/shared/ui/`.

**Decisions (confirmed):**
- Keep the existing **background upload** (enqueue + `router.back`, progress via the
  existing `upload-progress-card`) — not inline per-file progress in the screen.
- **Visual parity only.** No comment edit/delete, AI "enhance", mark-reviewed/finalize,
  or searchable combobox in this pass.

## Tasks

**A — New mobile primitives** (`mobile/src/components/ui/`, each with a co-located
`*.test.tsx`; built as counterparts of the web wrappers; follow the existing
convention: functional component, inline prop type, template-string classes with
`Record<Variant, string>` maps; colors only via `z-*` classes or `theme/colors.ts`).
- `z-badge.tsx` — `tone` (`neutral|primary|success|warning|danger`) + `label`; mirror
  the web tone classes (`rounded-md border px-2 py-1 text-xs font-semibold`).
- `z-field-label.tsx` — `label` + optional `required` asterisk (`text-z-primary`).
- `z-field-error.tsx` — `CircleAlert` icon + `message`, `text-z-danger`.
- `z-empty-state.tsx` — dashed card, icon tile, `title`/`description` + optional
  children (action slot).
- `z-card.tsx` — section wrapper (`rounded-lg border border-z-border bg-z-surface p-4`)
  with optional header; replaces the repeated inline card classes.
- `z-stepper.tsx` — `steps: {label, state: 'completed'|'active'|'upcoming'}[]` +
  `onStepPress`; horizontal `ScrollView`, numbered circles (Check when completed) +
  connector lines; mirror the web circle/label state classes.
- `z-select.tsx` — `value`/`options`/`placeholder`/`onValueChange`; trigger (selected
  label + `ChevronDown`) opens a `Modal` option list (the RN-native equivalent of the
  web hover dropdown); `invalid`/`disabled` states.
- `z-avatar.tsx` — `image` (resolved via existing `src/lib/avatar.ts` `avatarSrc`) or
  `fallback` initials; `size` prop; `rounded-md bg-z-surface-warm text-z-primary`.

**B — Rebuild `src/app/upload.tsx` as a 3-step wizard.** Header card (title + summary).
`z-stepper`: files → details → review. **Files:** pick-videos button + file cards
(`FileVideo` icon + name + size `z-badge` + remove). **Details:** `z-card` form —
`z-field-label` + `ZTextInput` (+ `z-field-error`) for title (required), `ZTextarea`
for description, `z-select` for group (required, + `z-field-error`) replacing the
chips. **Review:** summary `z-card` (`Check` icon + title/group/file count) + "start
upload". Validation gates step transitions (title + group + ≥1 file), matching web.
Behavior unchanged: on start, `uploadStore.enqueue` + `router.back`.

**C — Rebuild `src/app/asset/[id].tsx` with card structure.** Player stays
edge-to-edge at top. Below, single-column `z-card`s: (1) **Metadata card** — status
`z-badge` (in-review/reviewed from `data.status`), title, group (`z-avatar` + name,
tappable → `group/[id]`) when present, description. (2) **Video-parts card** (when
videos exist) — header + count `z-badge`; selectable rows with part label + status +
`review_count` `z-badge` (replacing the bare chips); keep active-part selection
driving the player + reviews. (3) **Comments card** — header (`MessageCircle` +
"Comments" + count `z-badge`); `ReviewItem` list; `z-empty-state` on zero;
`ReviewComposer` inside the card. Keep `ZScreen` insets on the loading/error branches.

**D — Enhance `src/components/review-item.tsx`.** Add `z-avatar` (author image/initials)
to the author line to match the web thread; keep the timestamp-seek chip, relative
time, and reply affordance. Update `review-item.test.tsx`.

## Out of scope (optional follow-ups)

Comment edit/delete, AI "enhance", mark-reviewed/finalize, searchable combobox,
inline upload progress.

## Verification

- `make mobile:lint && make mobile:typecheck && make mobile:test` (via wsl, `bash -ic`).
- New primitives have co-located tests; update the existing screen and `review-item`
  tests.
- i18n: only keys already present in en+de+fr of the synced JSONs — verify each
  web-copied key exists before use; never invent keys.
- Emulator screenshots of upload (all 3 steps) + asset detail for the PR (AGENTS.md).

## Commits

One commit per task (A primitives, B upload, C detail, D review-item) on
`feat/mobile-token-auth`; conventional commits, no co-author trailer. Part of the
single mobile PR (#15) — no intermediate merges to `main`. Completion report to
`.agents/reports/`.
