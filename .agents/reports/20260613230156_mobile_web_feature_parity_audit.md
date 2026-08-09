# Audit: Mobile ↔ Web Feature Parity

- **Date:** 2026-06-13
- **Method:** 9-domain parallel audit (90 subagents), every non-`present` item adversarially verified against the mobile code (grep/Read) before counting. Completeness-checked against the full web page + API-service set (0 uncovered surfaces).
- **Branch:** `feat/mobile-token-auth` (PR #15).

## Verdict

**No full parity yet — but the consumer/student journeys are at parity, and the gaps are concentrated in producer/admin surfaces + three whole web areas.** ~75–80% parity on shipped surfaces.

Tally across 145 audited features: **present 92 · partial 15 · deferred 26 · missing 31 · na 7**.

## By domain

| Domain | Status | One-line |
| --- | --- | --- |
| Auth & shell | mostly | Sign-in/session/gating at parity (native PKCE richer than web). Gaps: sign-out is local-only (no `/auth/logout`), tab shell not permission-gated, no `returnTo` deep-link. |
| Videos/Assets | mostly | List/detail/upload read+create strong. Missing reviewer write-tier (edit/delete comment, AI-enhance, mark-reviewed/finalize). |
| Reviews | mostly | Read+create+reply+seek at parity. Edit/delete/enhance missing **and not in the contract**. |
| Groups & invites | partial | Consumer side exceeds web (list/detail/members/leave + QR-scan join). Producer/admin side is the gap (create deferred; edit/delete/preferences/remove-member missing). |
| Coaching/sessions | mostly | Student journey near-full (book, list, cancel, Agora call, recording). Expert availability mgmt + in-call device panel deferred. |
| Profile & prefs | mostly | Profile + email prefs faithful. Sign-out partial; push prefs + account-deletion deferred/NA. |
| Notifications | **absent** | Entire in-app notification center missing; only backend push contract exists (itself deferred). |
| Reports | **absent** | Zero implementation; decision-only deferral; only dead i18n keys remain. |
| Home | mostly | Faithful port (+error/retry state web lacks). Only the 5th first-step "Set availability" omitted. |

## Genuine gaps (missing / partial)

**Three whole web areas absent on mobile:**
1. **In-app Notifications center** — bell/badge, list, unread count, mark-read/all, SSE stream, inline invite actions. ⛔ endpoints not in `docs/openapi.yaml`.
2. **Reports analytics** — period selector, KPI cards, group→leaf accordion, CSV/PDF export. ⛔ `/reports/events` not in the contract.
3. **Expert availability management** — session-type / weekly-schedule / blocked-date CRUD + the "Manage availability" entry + home nudge.

**Producer/admin tiers:**
4. **Group administration** — edit/update group, delete group, group-preferences screen, remove-member. ⛔ put/post/delete on `/groups/{id}` and `DELETE /groups/{id}/users/{id}` not in the mobile schema.
5. **Reviewer write-actions** — edit/delete comment, AI "enhance text", collapse/expand threads. ⛔ PUT/DELETE-review + `/reviews/enhance` not in the contract.
6. **Mark-reviewed / finalize asset** (with unreviewed-parts guard) — `/assets/{id}/finalize` unused; the finalized→read-only lifecycle has no mobile trigger.
7. **Invitation QR image + Download-QR (producer)** — `/groups/{id}/invitations/{id}/qr` not in the contract (mobile will generate client-side; see G-T3).

**Correctness/behaviour deltas worth flagging:**
- **Sign-out doesn't terminate the WorkOS server session** (local token clear only) → silent SSO re-login risk. (`profile.tsx:462`, `auth-store.ts:85`)
- **Tab/nav shell not permission-gated** — groups/coaching tabs render without the read permission (web hides them). (`(tabs)/_layout.tsx:16-35`)
- Timestamp comment is opt-in toggle (web auto-attaches live player time); no `returnTo` deep-link; aggregate (not per-file) upload progress; multi-part selection not in URL state; English-hardcoded relative-time; login copy hardcoded (empty `auth.login.*` in web source); group-list "create first group" CTA variant omitted.

## Deferred-with-plan (scaffolding exists)
- **Create group + create invitation** — hooks landed & tested (`groups.ts:76`, `invitations.ts:27`); screens deferred (plan `20260613203444`, G-T3).
- **Push delivery + prefs** — `RegisterDeviceRequest`/`PushPreferences` in `schema.d.ts`; no `/devices` call, no `expo-notifications`. Backend (Phase A) done.
- **Reports / availability / in-call device panel** — documented deferrals in plan `20260613114936` (decision-only; no contract/hook yet).

## Intentionally N/A (not gaps)
Asset delete (absent on web too), reschedule booking (cancel+rebook on both), detail breadcrumbs / drag-drop upload / Cmd+Enter submit (desktop patterns), account deletion (no web UI). Mobile-native **extras** with no web counterpart: pull-to-refresh, switch camera, persisted background upload, QR-scan/manual-code join.

## Key takeaway for sequencing
Several top gaps are **blocked at the contract layer** (`docs/openapi.yaml`) — notifications, reports, reviews edit/delete/enhance, finalize, group admin, invite QR. Those need a backend/contract change before any mobile screen can be built, so they're backend-first work, not pure mobile screens.
