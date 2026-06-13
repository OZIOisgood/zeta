# Mobile Remaining-Screens Web Parity + SOTA Hardening

## Context

Follows the upload/video-detail parity work
(`.agents/plans/20260613100635_mobile_upload_and_video_detail_web_parity.md`;
the 8 base primitives + those two screens are done). A 14-agent read-only audit (workflow `wf_d58c8bae-780`) compared every
remaining mobile screen against its web counterpart and against an RN/Expo
best-practice checklist. Full findings live in that workflow transcript; the
actionable items are folded into the phases below.

The mobile app is the design-follower: `web/dashboard-next` is the reference for
hierarchy, terminology, status chips, and copy (`mobile/AGENTS.md`). Net picture: the
data screens are behaviorally solid and well-tested, but most predate the
design-system push — they hand-roll empty/error/badge UI, miss the
tabs/dialog/toast/checkbox primitive family, lack keyboard handling, and carry
pockets of hardcoded English. A handful are genuine gaps (Home dashboard, Profile
editing) or bugs (group-detail swallows member-fetch errors).

### Recurring systemic findings
- **Missing primitives** block parity: `z-tabs`/`z-tab-panel`, `z-checkbox`,
  `z-combobox`, `z-avatar-input`, `z-toast`, `z-confirm-dialog` (modal layer),
  `z-video-preview`; plus `ZAvatar` circular variant and `ZButton` loading state.
- **No feedback layer** — mutations give no success feedback; destructive actions
  (cancel booking, leave group) are hand-rolled inline instead of confirm-dialog + toast.
- **`ZEmptyState` underused** — Home/Coaching/Groups/Booking/Invite/Call hand-roll
  empty + error states instead of the existing primitive.
- **No `KeyboardAvoidingView` anywhere** — Book/Invite/Upload inputs can be covered.
- **i18n holes** — Login fully hardcoded; Profile, tab labels, several error/empty
  strings; call-store error strings; terminology bug (tab "Coaching" vs screen/web
  "Sessions").
- **Virtualization** — Coaching and Group-detail use `ScrollView`+`.map` for
  variable-length lists instead of `FlatList`/`SectionList`.

### Scope decisions (confirmed with the user)
- **Home: full parity** — rebuild `index` as a real Home dashboard (stat cards,
  latest-videos preview, first-steps onboarding) AND add a dedicated Videos list
  screen with filter tabs. Tab set becomes Home / Videos / Sessions / Groups / Profile.
- **Deferred (documented decisions, not bugs):** in-app Notifications; Create-group on
  mobile (join-only stays); group-preferences edit/delete (Leave stays); Reports;
  Manage-availability (coach config); the call device-settings panel. Revisit if
  product needs them on mobile.

## Phases

Execution is **subagent-driven** (sequential implementer + spec-then-quality review
per task), primitives before the screens that consume them — same harness as the
prior parity work. Effort tags: S/M/L/XL.

### Phase 0 — Foundations (primitives + infra) [unblocks the rest]
Each new primitive is the mobile counterpart of the web wrapper (same name/variants),
with a co-located `*.test.tsx`. Build, do not wire into screens yet.
- **F1 `z-toast`** (S) — root-mounted toast host in `_layout.tsx` + imperative
  `showToast(title, message, tone)`; counterpart of web `z-toast` + app-shell toast state.
- **F2 `z-confirm-dialog` + `z-dialog-panel`** (M) — RN `Modal`-based confirm
  (title/description/tone/confirm+cancel labels, optional reason `ZTextarea`);
  counterpart of web `z-confirm-dialog`.
- **F3 `z-tabs` / `z-tab-panel`** (M) — URL/state-driven tabs with per-tab count
  badge support (sessions, videos filter, profile).
- **F4 `z-checkbox`** (S) — toggle row (email preferences).
- **F5 `z-combobox`** (M) — searchable/filterable select (language, timezone).
- **F6 `z-avatar-input`** (M) — avatar pick/preview via `expo-image-picker` (profile).
- **F7 `z-video-preview`** (S) — aspect-video thumbnail + `Video` fallback icon
  (home preview, videos list, asset-card).
- **F8 enhancements** (S) — `ZAvatar` `shape='circle'|'rounded'`; `ZButton`
  `loading` (ActivityIndicator); `ZEmptyState` error variant (tone + action child);
  a keyboard-aware wrapper (KeyboardAvoidingView helper, or a `ZScreen`
  `keyboardAware` opt-in).

### Phase 1 — Correctness & cheap parity (no full rebuilds)
- **C1 Group-detail error branch** (S, HIGH) — `group/[id].tsx` member queries only
  read `isPending`; a failed experts/students fetch renders "No experts yet" instead
  of an error. Add `isError`+`refetch` branches with retry, before the empty branch
  (`groups.membersLoadFailed`, `common.actions.retry` exist).
- **C2 i18n sweep + sync** (M) — replace hardcoded strings: login (all), profile,
  tab labels (`Coaching`→`common.nav.sessions`, add a profile/account key),
  `index.tsx` error/empty, `upload.tsx` groups-error, `asset-card` "Uploading"
  (→`upload.uploading`), `upload-progress-card` Dismiss/Retry, `invite` Back/code.
  Have `call-store` set stable error CODES mapped to `sessions.call.*` at render.
  Run `pnpm run sync:i18n` for genuinely-missing keys (`auth.login.*`,
  `preferences.email.*`, `common.actions.dismiss`) — never invent keys inline.
- **C3 Design-system reuse** (M) — `ZBadge` for status pills in `asset-card` +
  `booking-card` (drop local maps; tone semantics matching web); `ZEmptyState` for
  empty+error in home/coaching/groups; `ZIconButton` for `upload-progress-card`
  dismiss/retry.
- **C4 Virtualization** (S) — `coaching.tsx` → `SectionList` (upcoming/past sections,
  keep `RefreshControl`); group-detail member lists → `FlatList` with
  `ItemSeparatorComponent`.
- **C5 Keyboard handling** (S) — wrap input screens (book, invite, upload) with the
  F8 keyboard-aware helper + `keyboardShouldPersistTaps='handled'`.

### Phase 2 — Screen parity rebuilds (consume Phase 0)
- **P-Coaching** (L) — three tabs (upcoming/past/**cancelled**) with count badges via
  `z-tabs`; stop folding cancelled into past; show `cancellation_reason` on cancelled
  cards (`common.labels.reason`); recording-status `ZBadge` from `recording.status`
  (gate the open-recording button on `status==='ready'`); replace inline
  `CancelConfirm` with `z-confirm-dialog` (+ optional reason `ZTextarea`, pass to the
  mutation) + success toast; `ZCard`/`ZBadge`/`ZEmptyState`; restore `sessions.title`
  + `sessions.summary` header.
- **P-Booking** (L) — `ZStepper` 5 steps + per-step descriptions
  (`sessions.book.*Description`); post-booking success state (check +
  `bookedHeading`/`bookedDescription` + "View My Sessions") instead of silent
  `router.back()`; `ZEmptyState` with descriptions per empty section; per-section
  error+retry (`load*Failed`); slot start–end range + `common.labels.yourLocalTime`;
  `ZCard`/`ZBadge` for session-type + confirm; keyboard handling + a back button on
  confirm. (Keep the deliberate expert-scoped session-types behavior.)
- **P-GroupDetail** (L) — member rows: circular `ZAvatar` + role `ZBadge` + email
  line; section cards (icon tile + title + count `ZBadge` + description); member
  removal gated on `groups:user-list:delete` via `z-confirm-dialog` + toast;
  permission-gated invitation card routing to the existing invite flow;
  `ZEmptyState` for members-unavailable. (Builds on C1.)
- **P-Profile** (XL) — rebuild as a 2-tab preferences screen (`z-tabs`): Personal data
  (name `ZTextInput`, language/timezone `z-combobox`, `z-avatar-input`) + Email
  preferences (`z-checkbox` rows + master toggle, each gated on the same permissions
  web uses). Add `updateCurrentUser(UpdateMeRequest)` to `auth-store` (PUT /auth/me,
  re-sync user + `i18next.changeLanguage`); loading skeleton, save-error banner,
  success toast. Run `sync:i18n` for `preferences.email.*` first. Add screen test.
- **P-Login** (M) — wire `useTranslation`; sync `auth.login.*`, reuse
  `app.brand`/`app.tagline`; add the Zeta brand-mark asset + `ZCard` hierarchy;
  `accessibilityLiveRegion` on the error; `ZButton` loading; screen test.
- **P-Invite** (M) — `ZCard`/`ZAvatar`/`ZEmptyState`/`ZFieldError`; success/error
  toast; keyboard handling; QR viewfinder `accessibilityLabel` + caption; localize
  Back/code labels.
- **P-Call** (M) — store sets error CODES → `t()` mapping (from C2); wrap
  error/permission states in `ZCard` with headings (`sessions.call.couldNotJoin`);
  drop the visible "Connecting…" text (skeleton only); replace off-token
  `bg-black`/`text-white`/`text-gray-400` with a sanctioned dark call-surface token.
  (Device-settings panel deferred — document the dead `common.labels.microphone`
  keys.)

### Phase 3 — New in-scope surfaces
- **H-Home** (L) — rebuild `(tabs)/index.tsx` as the Home dashboard: a 3-up stat-card
  row (Videos/Groups/Sessions counts → nav), a "Latest videos" preview (bounded slice
  + "View all" → Videos route) using `z-video-preview`, and the permission-gated
  first-steps onboarding card (`home.firstSteps.*`, keys already synced). New
  `StatCard` domain component. Uses existing assets/groups/coaching queries.
- **V-Videos** (M) — new dedicated Videos list route holding the current full
  `FlatList` + a `z-tabs` filter row (All / To review / Reviewed) with counts; tune
  `FlatList` (`ItemSeparatorComponent`, drop card `mb-3`). Update the tab bar to
  Home / Videos / Sessions / Groups / Profile, all titles via `t()`.

### Phase 4 — Cross-cutting hardening
- **T-Tests** (M) — `login.tsx` (busy/failed), `auth/callback.tsx` redirect branches,
  `_layout.tsx` `Stack.Protected` auth guard, `(tabs)/_layout` localized tab titles.
- **T-Headers** (S) — a shared, localized screen-header pattern (title + optional
  action slot) so tabs stop hand-rolling inconsistent header rows.

## Deferred (documented decisions)
In-app Notifications; Create-group on mobile; group-preferences edit/delete; Reports;
Manage-availability; the call device-settings panel. Each is desktop-first or
lower-value on mobile for now; revisit per product need. Dead i18n keys for these
surfaces stay (cheap) but should not be treated as TODO drift.

## Execution & Verification
- Subagent-driven: Phase 0 as one workflow (sequential implementer + spec/quality
  review per primitive); then phase workflows for screens, staying in the loop at each
  phase boundary. Never parallel implementers (shared tree).
- Per task: `pnpm run lint`, `pnpm exec tsc --noEmit`, full `pnpm run test` must stay
  green (run via `wsl.exe -d ubuntu bash -lc "cd ~/dev/projects/zeta/mobile && …"`);
  co-located/`src/__tests__` tests for new behavior; never tests under `src/app/`.
- i18n: only keys present in en+de+fr; run `pnpm run sync:i18n` for new keys before use.
- Conventional commits, no Co-Authored-By; part of PR #15, no intermediate merges to
  main, push only on request; emulator screenshots of changed screens for the PR;
  completion report to `.agents/reports/`.

## Suggested order
Phase 0 → C1 (the bug) → C2/C3/C4/C5 → P-Coaching/P-Booking/P-GroupDetail/P-Profile →
P-Login/P-Invite/P-Call → H-Home/V-Videos → Phase 4. Phases 0–1 are low-risk and high
value; Profile and Home are the two XL/L items that need the most new primitives.
