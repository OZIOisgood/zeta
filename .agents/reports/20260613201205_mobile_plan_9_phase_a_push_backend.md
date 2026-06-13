# Completion Report: Mobile Plan 9 Phase A — Push Backend + Contract

- **Date:** 2026-06-13
- **Plan:** `.agents/plans/20260613191948_mobile_plan_9_push_notifications.md` (Phase A of package #7 of the master plan)
- **Branch:** `feat/mobile-token-auth` (PR #15) — committed locally, **not pushed** (shared working tree with a parallel session; push to be coordinated when they finish).

## Why Phase A only

A parallel session is editing `mobile/src/app/(tabs)/{videos,groups,coaching,index}.tsx` (T-Headers) in the **same working tree**. Phase A is the **collision-free backend half** (zero `mobile/src/app/**` edits). Phase B (mobile: expo-notifications, registration, tap-handling, Profile push section) is deferred until their parity work lands AND a new EAS dev build is made (expo-notifications is a native module).

Shared-tree discipline observed throughout: no `git checkout`/branch switch, only backend/db/contract files touched, no full mobile `tsc`/`jest` run (would compile their in-flight files).

## What landed (commits)

| Commit | Task | Content |
| --- | --- | --- |
| `59dd18b` | A1 | `user_devices` table + 6 `push_*` preference columns on `user_preferences`; sqlc `UpsertDevice`/`DeleteDevice`/`DeleteDeviceByToken`/`ListDevicesForUser` + `GetUserPushPreferences`/`UpdateUserPushPreferences` |
| `450f930` | A2 | `POST /devices` (upsert, Expo-token validation) + `DELETE /devices/{token}` (scoped), behind `RequireAuth`; tokens never fully logged |
| `2dd5531`, `feb0c89` | A3 | `internal/push` — `BuildMessage(type, payload)` + `Sender.Notify` (injectable httpDoer, exp.host batch send, `DeviceNotRegistered` token pruning); `push` does NOT import `notifications` (cycle-free) |
| `20811f9` | A4 | `notifications.Notifier` interface + `SetNotifier` (wired once in `server.go`); `Record` fires push after the in-app insert, gated by `preferences.AllowsUserPush`; in-app row + SSE path unchanged |
| `0db2862` | A5 | OpenAPI: `/devices` endpoints + `PushPreferences` on `Me`/`UpdateMe`; `/auth/me` reads/writes push prefs (mirrors email); mobile `schema.d.ts` regenerated (idempotent) |

## Verified (integration review + gates at HEAD)

- **Type→category→column trace correct for all 5 notification types** (e.g. `TypeVideoReviewed → AssetReviews → push_asset_reviews_enabled`); `CoachingReminders` correctly has no push column.
- **Deep-link `data` keys** (`asset_id`/`group_id`/`booking_id`/`code`) match each payload's actual fields — the Phase-B tap-handler will navigate correctly.
- In-app insert stays **unconditional**; SSE/web behavior unaffected by push prefs. No import cycle. No token/secret logged.
- `go test ./...` green; `make api:openapi:lint` 0 errors; `schema.d.ts` idempotent.

## Release prerequisites & follow-ups

- ⚠️ **`EXPO_ACCESS_TOKEN` (release-time).** Optional — Expo accepts unauthenticated sends, so push works without it; it is security hardening (and required if the Expo project enables enhanced security). To enable: create the GCP Secret Manager secret, then add `EXPO_ACCESS_TOKEN=zeta-{env}-expo-access-token:latest` to `--set-secrets` in `deploy-dev.yml`/`deploy-prod.yml`. NOT wired now because referencing a non-existent secret would break the deploy. Documented in `.env.example`.
- MINOR: `DELETE /devices/{token}` can return 500 on DB error but the OpenAPI documents 204-only — add a `500` response for honesty (low value; client doesn't branch on it).
- NIT: a compile-time round-trip test asserting `push/message.go`'s mirrored payload structs stay in sync with `notifications/types.go` would catch silent deep-link drift on future field additions.
- DB migration ordering is clean on this branch; other worktrees carrying `2026061x` migrations are the known shared-DB-collision caveat (no action here).

## Phase B (deferred — gated on the parallel session + a new dev build)

expo-notifications install + EAS dev build · token registration wired to sign-in/out · foreground + tap-to-deep-link handler (`routeForNotification`) · Profile "Push notifications" section (mirrors Email, via `PUT /auth/me`) · i18n + verification. Coordinates with the parallel session's `P-Profile` and `_layout.tsx` work.
