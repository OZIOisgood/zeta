# Mobile↔Web Parity — Master Roadmap

> **This is a COARSE umbrella plan.** It inventories the verified parity gaps, sequences them into work packages, and **triggers a detailed sub-plan per package** (authored when the package is picked up). Each sub-plan is a full `superpowers:writing-plans` TDD plan; this document only sets each package's scope, dependencies, and order. Execute packages one at a time into PR #15.

**Goal:** Bring the Expo/React-Native mobile app to feature parity with the `web/dashboard-next` Angular app and fix the correctness defects the audit surfaced.

**Source of truth:** `.agents/reports/20260613230156_mobile_web_feature_parity_audit.md` (9-domain audit, 90 subagents, every gap verified). Tally: 92 present · 15 partial · 26 deferred · 31 missing · 7 N/A.

**Key architectural fact (verified in `internal/api/server.go`):** every gap-area **backend handler already exists** — notifications (LISTEN/NOTIFY hub + SSE), reports, reviews enhance/edit/delete, group update/delete, remove-member, availability. The web app reaches several of these via Angular `HttpClient` *outside* the typed contract, so they are simply **absent from `docs/openapi.yaml`** (the mobile client's source). Therefore almost every package has the same shape and needs **no new backend logic**:

> **The standard package shape (S):** (1) surface the existing backend endpoint(s) into `docs/openapi.yaml` + `make api:openapi:lint`; (2) `pnpm --dir mobile run generate:api`; (3) add TanStack hooks in `mobile/src/api/queries/*`; (4) build the `z-*`-primitive screens against the named web counterpart (parity gate); (5) i18n via web JSON source + `sync:i18n` (re-add mobile-only keys — destructive sync); (6) tests + emulator screenshots. This is exactly the create/invite slice (`4fc37f4`) shape.

**Tech stack:** Go/chi/sqlc backend (unchanged), `docs/openapi.yaml` contract, `openapi-typescript` client, Expo SDK 56 + expo-router + NativeWind + TanStack Query + i18next, jest-expo/RNTL. Agora (calls), expo-notifications (push), react-native-qrcode-svg (invite QR).

---

## Operating constraints (carry into every package)

- **Single PR #15**, branch `feat/mobile-token-auth`. No intermediate merges to main. Local commits per task; push only when the user asks. (memory: mobile single PR; clean history.)
- **Shared working tree** with a parallel session may resume — before any package that edits `src/app/(tabs)/*` or `group/[id].tsx`/`_layout.tsx`/`profile.tsx`, confirm the parallel session is done.
- **Shared dev DB (port 5434)** — no package here needs a migration, but if one does, use `ZETA_DB_PORT`/testcontainers, never migrate the shared instance. (memory: shared-DB migration collisions.)
- **WSL** for all tooling: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && …"`. (memory: WSL build commands.)
- **Contract terminology:** `asset`==`video`; keep API/db field names, say "video" in UI copy.
- **Native modules** (expo-notifications, any new) need a fresh EAS dev build — call it out as a release step, don't assume Expo Go.

---

## Package inventory & sequencing

Ordered by (a) risk/size, (b) dependency. ✅ = detailed sub-plan already exists. 🆕 = sub-plan to be authored (the "trigger").

| # | Package | Size | Own plan? | Blocks on |
| --- | --- | --- | --- | --- |
| **WP0** | Correctness quick-fixes (auth logout, tab permission-gating, small mobile-only deltas) | S | 🆕 `*_parity_quick_fixes.md` | nothing — **do first** |
| **WP1** | Groups create + invite **screens** (G-T3) | M | ✅ `20260613203444_mobile_groups_expert_create_invite.md` | parallel session done |
| **WP2** | Push **Phase B** (device registration, tap-deep-link, profile push section) | M | ✅ `20260613191948_mobile_plan_9_push_notifications.md` (Phase B) | WP6 Profile rebuild?; new EAS build |
| **WP3** | In-app **Notifications center** | L | 🆕 `*_mobile_notifications_center.md` | contract surfacing; pairs with WP2 |
| **WP4** | **Reviewer write-lifecycle** (edit/delete comment, AI-enhance, mark-reviewed/finalize) | M | 🆕 `*_mobile_review_write_lifecycle.md` | contract surfacing |
| **WP5** | **Group administration** (edit/delete group, group-preferences, remove member) | M-L | 🆕 `*_mobile_group_admin.md` | contract surfacing; WP1 lands first |
| **WP6** | **Expert availability management** | L | 🆕 `*_mobile_expert_availability.md` | contract surfacing |
| **WP7** | **Reports analytics** | L | 🆕 `*_mobile_reports.md` | **brainstorm scope first** (full vs trimmed) + contract surfacing |
| **WP8** | Compliance/release: **account deletion + Sign-in-with-Apple** | M | 🆕 `*_mobile_compliance_release.md` | design decision (Apple guideline) |

**Recommended execution order:** WP0 → WP1 → WP4 → WP5 → WP3 → WP2 → WP6 → WP7 → WP8.
Rationale: WP0 is small + security-relevant. WP1 is already-scaffolded and unblocks the groups-admin parity story. WP4/WP5 are medium contract-surfacing wins reusing the slice pattern. WP3+WP2 together complete the notifications story (in-app + push). WP6/WP7 are the largest and most design-laden (availability UX; reports scope). WP8 is release-gating but independent.

---

## Per-package scope specs (the brief each 🆕 sub-plan must satisfy)

### WP0 — Correctness quick-fixes  *(author `…_parity_quick_fixes.md` first; small enough to be one plan)*
Backend exists; pure mobile. Must cover:
1. **Sign-out terminates the WorkOS session.** Today `profile.tsx:462`/`auth-store.ts:85` only clear local tokens. Call the existing `logout` operation (already in `docs/openapi.yaml`, `operationId: logout`) on sign-out, then clear tokens; handle failure gracefully (still clear locally). Test: sign-out calls the endpoint then clears the store.
2. **Permission-gate the tab shell.** `(tabs)/_layout.tsx:16-35` renders all 5 tabs unconditionally. Hide Groups/Coaching tabs when the user lacks `groups:read`/`coaching:*` (mirror the web nav guard) and block the route. Test: tabs render conditionally on permissions.
3. **(Optional, fold if cheap) small mobile-only deltas:** `returnTo` deep-link after login (`callback.tsx:35`), default-attach live player time to timestamp comments, group-list "create first group" empty-state CTA variant. Each gets its own task or is deferred to the owning package — decide in the sub-plan.
> ⚠️ Touches `(tabs)/_layout.tsx`, `profile.tsx` — confirm parallel session done.

### WP1 — Groups create + invite screens  *(plan exists: `20260613203444`, tasks G-T3)*
Contract + hooks already shipped (`4fc37f4`). Execute G-T3: `groups:create` FAB on the Groups tab, `src/app/group/create.tsx` form (name + required `ZAvatarInput` + description), invite section on `group/[id].tsx` with client-side QR (`react-native-qrcode-svg` encoding `<webBase>/groups?invite=<code>`), copy/share, two-variant toast, Done + QR-fail fallback. No new sub-plan needed — just run it.

### WP2 — Push Phase B  *(plan exists: `20260613191948`, Phase B)*
Backend (Phase A) shipped. Execute Phase B: `expo-notifications` install + EAS dev build, token registration on sign-in/out, foreground + tap→deep-link handler (`routeForNotification`), Profile "Push notifications" section mirroring Email. Coordinates with WP6/Profile. No new sub-plan — run the existing Phase B.

### WP3 — In-app Notifications center  *(🆕 author detailed plan)*
Backend: `internal/notifications` (Hub + LISTEN/NOTIFY + SSE), routes `r.Route("/notifications", …)` (`server.go:210`). Web ref: `pages/notifications`, `features/notifications`, `core/http/notifications-api.service.ts`. Shape **S** plus realtime. The sub-plan must cover: surface `/notifications` (list + unread_count), `/notifications/{id}/read`, `/notifications/read-all`, and the SSE `/stream` into `docs/openapi.yaml` (SSE may stay outside the typed client — decide); a notifications query hook + an SSE/poll subscription; a bell + unread badge in the header/shell; a notifications screen (list, unread/read states, mark-read, mark-all, navigate-to-target deep-link, inline invite accept/decline reusing existing invitation hooks, four query states); i18n; tests. **Pairs with WP2** (same domain; a tapped push deep-links into the same targets).

### WP4 — Reviewer write-lifecycle  *(🆕 author detailed plan)*
Backend exists: `reviewsHandler` (`/reviews/enhance` `server.go:192`, edit/delete under `/assets/videos` routes), and asset finalize. Web ref: `features/videos` review UI + `pages/video-details`. Shape **S**. Sub-plan covers: surface PUT/DELETE review + `POST /reviews/enhance` + `POST /assets/{id}/finalize` (+ `assets:finalize`) into `docs/openapi.yaml`; hooks (`useUpdateReviewMutation`, `useDeleteReviewMutation`, `useEnhanceTextMutation`, `useFinalizeAssetMutation`); UI on `asset/[id].tsx` — edit/delete own comment (`ZConfirmDialog` for delete), AI "enhance text" affordance on the composer, collapse/expand threads, and a mark-reviewed/finalize action with the unreviewed-parts guard dialog (finalized→read-only state). i18n + tests.

### WP5 — Group administration  *(🆕 author detailed plan)*
Backend exists: `UpdateGroupPreferences` (PUT `/groups/{groupID}` `server.go:198`), `DeleteGroup` (199), `RemoveGroupUser` (DELETE `/groups/{groupID}/users/{userID}` 203). Web ref: `pages/group-preferences`, `pages/group-details` (member admin). Shape **S**. Sub-plan covers: surface PUT/DELETE `/groups/{id}` + DELETE member into `docs/openapi.yaml`; hooks (`useUpdateGroupMutation`, `useDeleteGroupMutation`, `useRemoveMemberMutation`); a group-preferences/edit screen (name/description/avatar edit, delete-group with confirm) gated on owner/admin perms; remove-member action in the members list (confirm dialog). i18n + tests. **Run after WP1** (shares `group/[id].tsx`).

### WP6 — Expert availability management  *(🆕 author detailed plan)*
Backend exists in coaching (web `pages/manage-availability` + `coaching-api.service.ts`; confirm the exact route names first). Shape **S**, large UX. Sub-plan covers: surface session-type CRUD + weekly-schedule CRUD + blocked-date CRUD into `docs/openapi.yaml`; write hooks in `coaching.ts`; an availability-management screen (or section) gated on `coaching:availability:manage`; the "Manage availability" entry point + the home first-steps "Set availability" nudge (the omitted 5th step). i18n + tests. **First step: confirm backend availability endpoints exist; if any are missing, add a backend sub-task.**

### WP7 — Reports analytics  *(🆕 — BRAINSTORM scope before writing the plan)*
Backend exists: `reportsHandler` (`/reports/events` `server.go:211`). Web ref: `pages/reports`, `features/reports`, `core/http/reports-api.service.ts`. This is the most desktop-heavy surface (period selector, KPI cards, group→leaf accordion, CSV/PDF export). **Decision needed (use `superpowers:brainstorming`):** full port vs a trimmed mobile-appropriate summary (KPIs + a simple list; defer CSV/PDF export which is awkward on mobile). The sub-plan follows shape **S** for the chosen scope: surface `/reports/events`, an aggregation hook, a reports screen, i18n, tests. Note: existing dead `reports.*` i18n keys are already synced.

### WP8 — Compliance / release  *(🆕 author detailed plan; design-gated)*
Master-plan package #8. No web counterpart for some items → cite external specs (`mobile/AGENTS.md` rule). Sub-plan covers: **account deletion** (App Store Guideline 5.1.1(v) requires it once account management ships; backend deletion endpoint may be net-new — confirm, this is the one likely backend gap), and **Sign-in-with-Apple** (Apple requires SIWA because Google login is enabled — `expo-apple-authentication`, backend WorkOS provider wiring). Also fold the release follow-ups already logged: `EXPO_ACCESS_TOKEN` GCP secret + deploy wiring, production FCM/APNs credentials for push.

---

## How a package gets "triggered"

When a package is picked up:
1. If it has ✅ an existing plan (WP1, WP2) → execute it directly via `superpowers:subagent-driven-development`.
2. If 🆕 → author its detailed plan with `superpowers:writing-plans` (full TDD task breakdown using shape **S**), saved as `.agents/plans/<ts>_<name>.md`, then execute. WP7 inserts a `superpowers:brainstorming` step before its plan.
3. Each package ends with: mobile gates green (`make mobile:lint`/`typecheck`/`test`), `make api:openapi:lint` if the contract changed, emulator screenshots in the PR body, and a short report in `.agents/reports/`.

## Definition of done (whole roadmap)
- Every audit `missing`/`partial`/`deferred` item is either `present` on mobile or re-classified `na` with a written reason.
- `docs/openapi.yaml` contains every endpoint the mobile app calls; `schema.d.ts` regenerated.
- The two WP0 correctness defects fixed and tested.
- Re-run the parity audit (or a scoped re-check) → no unexplained gaps.

## Out of scope (stays N/A — from the audit)
Asset delete (absent on web too), reschedule booking (cancel+rebook), desktop affordances (breadcrumbs, drag-drop upload, Cmd+Enter). Mobile-native extras (pull-to-refresh, camera switch, background upload, QR-scan join) are kept, not removed.
