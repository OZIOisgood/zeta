# Mobile Plan 9: Push Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Server-sent push notifications for the five existing notification events. The backend registers device tokens, and every `notifications.Record(...)` additionally delivers an Expo push to the recipient's devices (gated by preferences); the mobile app registers its Expo push token on sign-in, handles foreground notifications, and deep-links to the right screen when a notification is tapped.

**This is package #7 of the master plan** (`.agents/plans/20260611225227_mobile_app_react_native_expo_design.md`, suggested order line 96) — push, then compliance/release. Greenfield: no push/device code exists on either side today.

## Coordination & sequencing (important)

A parallel session is actively editing `mobile/` (web-parity + header rewiring). Therefore this plan is split so the **collision-free half runs first**:
- **Phase A — Backend + contract: zero `mobile/` edits → execute now.**
- **Phase B — Mobile: edits `_layout.tsx`, auth-store, Profile → sequence AFTER the parallel parity work lands** (especially `P-Profile`, which rebuilds the preferences screen this plan extends). Phase B also needs a **new EAS dev build** (expo-notifications is a native module — like Agora).
- ⚠️ **DB migration collision:** the shared dev DB (`zeta-db`, port 5434) has already caused cross-session migration breakage. Run/verify the Phase-A migration against a **private DB via `ZETA_DB_PORT`**, or coordinate timing so the shared instance isn't mid-migration in another session. (See memory: shared-DB migration collisions.)

## Decision to confirm before B1 (migration shape)

**Push preference granularity.** The email model is master `email_notifications_enabled` + six per-category booleans. Options:
- **(Recommended) Mirror it for push** — `push_notifications_enabled` master + per-category `push_*_enabled`, so the Profile screen gets a "Push" section symmetric to "Email" and users can opt channels independently. More migration + Profile surface, but parity-correct.
- **(Lean) Master only** — a single `push_notifications_enabled`; per-event control is shared with… nothing (email categories stay email-only). Smaller, but coarser.

The migration (B1) and the Profile section (M4) depend on this — **confirm before B1 runs.** The plan below assumes the mirrored model; adjust column set if Lean is chosen.

---

## Phase A — Backend + contract (collision-free, execute now)

### A1 — Migration: `user_devices` + push preference columns
**Files:** `db/migrations/<seq>_create_user_devices.{up,down}.sql`, `db/queries/devices.sql`, push-pref columns added to the existing `user_preferences` migration pattern (new migration), `make db:sqlc`.
- [ ] `make db:migrate:create` → `user_devices`: `id uuid pk`, `user_id text not null` (WorkOS id, FK semantics like other user-keyed tables), `expo_push_token text not null unique`, `platform text` (`ios|android`), `created_at`, `last_seen_at`. Index on `user_id`. A token belongs to one user — re-registering the same token for a new user updates `user_id` (upsert on the unique token).
- [ ] Migration adding push preference columns to `user_preferences` (mirrored model): `push_notifications_enabled bool not null default true` + `push_asset_uploads_enabled`, `push_asset_reviews_enabled`, `push_invitation_updates_enabled`, `push_group_membership_updates_enabled`, `push_coaching_booking_updates_enabled` (default true). (No `coaching_reminders` push for now — reminders are email-only.)
- [ ] `db/queries/devices.sql`: `UpsertDevice` (on conflict (expo_push_token) do update user_id/platform/last_seen), `DeleteDevice` (by token, scoped to user), `ListDevicesForUser`. `make db:sqlc`. Never hand-edit `internal/db`.
- [ ] ⚠️ run the migration against a private DB (`ZETA_DB_PORT`), `make test:unit`, commit `feat(db): add user_devices and push preference columns`.

### A2 — Device register/unregister endpoints
**Files:** `internal/devices/handler.go` (+ `handler_test.go`), wire in `internal/api/server.go` (protected group).
- [ ] `POST /devices` body `{expo_push_token, platform}` → upsert for `auth.GetUser(ctx).ID`; 200. `DELETE /devices/{token}` → delete (scoped to the caller); 204. Validate token shape (`ExponentPushToken[...]`), reject empty. slog structured logging; **never log the full token** (log a prefix/hash if needed).
- [ ] Table-driven handler tests (owner upsert, re-register moves token to new user, delete scoped to caller, unauth 401). `make test:unit`. Commit `feat(devices): add push token register/unregister endpoints`.

### A3 — Expo push sender
**Files:** `internal/push/sender.go` (+ `sender_test.go`), `internal/push/message.go` (type→title/body/data mapping).
- [ ] A `Sender` with an injectable `httpDoer` (for tests) that takes `(ctx, recipientID, notifications.Type, payloadJSON)`, looks up the recipient's devices, builds Expo messages — `to`, `title`, `body`, and a `data` object carrying the deep-link (`{type, group_id?|asset_id?|booking_id?}` from the payload) — and POSTs to `https://exp.host/--/api/v2/push/send` (batch). Parse the receipt response; on `DeviceNotRegistered` ticket errors, delete that token (`DeleteDevice`). Title/body are derived from the notification type + payload (English keys live server-side or are simple literals — these are OS-level strings, not in-app i18n; keep them minimal and localized later via the recipient's `user_preferences.language` if cheap).
- [ ] `message.go`: pure `func BuildMessage(type, payload) (title, body, data)` per the 5 types — unit-tested for each type. Sender tests with a mock `httpDoer` (success, `DeviceNotRegistered` → token pruned, HTTP error swallowed).
- [ ] `EXPO_ACCESS_TOKEN` optional env (for higher rate limits / security) — wire from config, update `.env.example` + Terraform per repo rules. Commit `feat(push): add Expo push sender with token pruning`.

### A4 — Hook push into `notifications.Record`
**Files:** `internal/notifications/record.go`, its constructor/call sites, `record_test.go`.
- [ ] After the in-app row is created, fire-and-forget a push send for the recipient — **gated by push preferences** (master `push_notifications_enabled` + the per-category flag matching the type, mirroring `preferences.AllowsUserEmail`). In-app recording stays unconditional (matches the existing email-independent behavior). Inject the `Sender` (or a `push.Notifier` interface) into the notification path so `Record` stays testable and the dependency is optional (nil sender = no push, for tests/Web-only builds). Errors swallowed + logged, never break the request.
- [ ] Add `preferences.AllowsUserPush(ctx, q, log, userID, category)` mirroring `AllowsUserEmail`. Map each `notifications.Type` → push category. Tests: push fired when allowed, suppressed when master-off or category-off, sender error swallowed. `make test:unit`. Commit `feat(notifications): deliver push alongside in-app records`.

### A5 — Contract: devices + push preferences
**Files:** `docs/openapi.yaml`, regenerate `mobile/src/api/schema.d.ts`.
- [ ] Add `POST /devices` (RegisterDeviceRequest `{expo_push_token, platform}`), `DELETE /devices/{token}`. Extend the `Me`/`UpdateMeRequest` `email_preferences` sibling with a `push_preferences` object (same shape, mirrored) so the Profile screen can read/write it via the existing `/auth/me` flow — verify the Go `Me`/`UpdateMe` handlers actually serialize the new push columns (update `internal/auth/handler.go` + `internal/preferences` accordingly; this is part of A1/A4 backend work, reflected here in the contract).
- [ ] `make api:openapi:lint` (0 errors), regenerate, `make test:unit` + mobile suite green. Commit `feat(api): add device and push-preference endpoints to the contract`.

---

## Phase B — Mobile (sequence AFTER parity lands; needs a new EAS dev build)

### B1 — expo-notifications setup + dev build
- [ ] `pnpm exec expo install expo-notifications`; app.json plugin + Android notification channel/icon, iOS `aps-environment`. Note: Expo push works via Expo's service in dev; **production Android needs an FCM credential** (`google-services` / EAS push credentials) — document as a release follow-up. Trigger a new `development` EAS build (native module added) and install the APK.

### B2 — Token registration wired to auth
**Files:** `mobile/src/push/registration.ts` (+test), `mobile/src/auth/auth-store.ts`.
- [ ] On sign-in (and app launch while signed in): request permission with priming (per expo-notifications guidance — explain before the OS prompt), get the Expo push token, `POST /devices`. On sign-out: `DELETE /devices/{token}` before clearing tokens. Permission-denied is a no-op (not an error). Pure token-shape/registration logic unit-tested with a fake client.

### B3 — Foreground + tap handling (deep-link)
**Files:** `mobile/src/push/handler.ts` (+test), root `_layout.tsx`.
- [ ] Set the notification handler (foreground display). On notification response (tap), read `data.{type, group_id|asset_id|booking_id}` and `router.push(...)` to the matching screen (`/asset/{id}`, `/group/{id}`, the Sessions tab). Pure `routeForNotification(data)` mapper unit-tested per type. (This in-app tap routing does NOT need OS Universal/App Links — those stay a separate follow-up.)

### B4 — Profile push-preferences section
**Files:** Profile screen (coordinate with the parallel session's P-Profile rebuild), `auth-store` `updateCurrentUser`.
- [ ] A "Push notifications" section mirroring the Email section (`ZCheckbox` rows, master toggle), reading/writing `push_preferences` via `PUT /auth/me`. ⚠️ This collides with P-Profile — build only after their Profile rebuild lands, on top of it.

### B5 — i18n + docs + final verification
- [ ] i18n for any new mobile-facing copy (priming text, push-pref labels) via the web-source + `sync:i18n` workflow. `mobile/README.md` push section; root README architecture diagram already shows the push edge — verify. Full battery (mobile gates + api lint + Go suite + expo export). PR #15 body + screenshots.

---

## Out of scope (follow-ups)
- OS-level Universal Links / App Links (AASA + assetlinks.json) for invite URLs opened outside the app — separate small package (Backend-Changes #4 in the master spec).
- Production FCM/APNs credentials in EAS (release-time).
- Localizing push title/body by recipient language (cheap enhancement once the channel works).
- Reminder push (coaching reminders are email-only today).

## Verification checklist (end of plan)
- [ ] Phase A: migration applied (private DB), `make test:unit` + `make api:openapi:lint` green, schema regenerated & idempotent, no token logged.
- [ ] Phase B: mobile gates green, dev build installed, tap-to-navigate works per type on device, permission-denied is graceful.
