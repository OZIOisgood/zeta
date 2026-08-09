# Mobile Compliance & Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to execute this plan. Dispatch one subagent per Task, in order. Each Task is test-first: write the failing test, run it and observe the documented FAIL, write the minimal implementation, run it and observe PASS, then commit. Steps use checkbox (`- [ ]`) syntax — check each one only after its command output matches what this plan says to expect. Do **not** batch Tasks; do **not** skip the FAIL observation.

**Goal:** Make the Expo mobile app App-Store-submittable for WP8 (compliance + release). Three deliverables: **(a) account deletion** (App Store Review Guideline **5.1.1(v)** — apps that support account creation must let the user delete their account from within the app); **(b) Sign-in-with-Apple** (Guideline **4.8** + Apple HIG — required because the app already offers a third-party social login, Google, via WorkOS AuthKit); **(c) release follow-ups** — the `EXPO_ACCESS_TOKEN` GCP secret + deploy wiring, and production FCM (Android) / APNs (iOS) push credentials registered in EAS.

**Architecture (Standard Package Shape "S"):** Most of WP8 is contract-surfacing + mobile, because the backend usually already exists. **One exception, verified below:** there is **no** existing delete-account endpoint anywhere under `internal/` (grep proof in Task B-1), so account deletion is the **single net-new backend task** of this package — a new handler + sqlc account-scrub queries (one per user-owned table, see B-2's deletion-completeness audit) + route + tests on top of the existing `internal/auth` handler, then surfaced into `docs/openapi.yaml`, then a mobile hook + profile flow. Sign-in-with-Apple is **mobile + WorkOS-config only** (no Zeta backend change — the existing `/auth/token` PKCE exchange already accepts any AuthKit provider). Release follow-ups touch CI/Terraform-adjacent config + EAS only.

**Tech Stack:** Go 1.x (chi, sqlc, `log/slog`, WorkOS `usermanagement` SDK v4.46.1, gomock/testify) for the backend; Expo SDK 56 / React Native, expo-router, NativeWind, react-i18next, `@tanstack/react-query`, zustand, openapi-fetch + openapi-typescript, jest-expo / React Native Testing Library for mobile; `expo-apple-authentication` for SIWA; GitHub Actions + gcloud + GCP Secret Manager + EAS for release.

**Shell:** every command is wrapped: `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && <cmd>"`. Go tooling is not on the `make` PATH — call binaries directly: `/usr/local/go/bin/go`, `~/go/bin/sqlc`, `~/go/bin/mockgen`, `~/go/bin/migrate`. Do **not** run codegen/lint/git as part of *authoring* — they are real steps the executing subagents run.

**Depends on:** WP-UI0 (`20260613233000_mobile_shared_ui_foundation.md`). The Profile Danger-Zone delete UI (Task B-8) reuses the shared **`ZDangerZoneCard`** primitive — the single destructive-action card shared with group-delete — by its exact props; it is **not** hand-styled here. Sequence WP-UI0 before Task B-8. The collision-free backend/contract/hook Tasks (B-1..B-7) have no WP-UI0 dependency.

**Depends on:** the dedicated push plan `20260613191948_mobile_plan_9_push_notifications.md` (Task B1) **owns** the `expo-notifications` install + `app.json` plugin + the EAS dev build. WP8's release Task (B-12) does **not** re-install or re-add that plugin; it only adds the production release credentials (the `EXPO_ACCESS_TOKEN` GCP secret follow-up and the FCM/APNs upload), sequenced after the push plan lands.

---

## Constraints (state these in every Task's commit context)

- **Single PR:** all WP8 work lands on branch **`feat/mobile-token-auth`** as commits toward **PR #15**. **No push** during execution; the user pushes. Local commit per Task only.
- **Shared working tree:** screen-touching Tasks (B-5 profile delete UI, B-7 SIWA login button) gate on the parallel session — do **not** start them until the user signals the parallel session that owns `src/app/**` is done. Contract/hook/backend Tasks (B-1..B-4) are collision-free and run now.
- **No shared-DB migration during parallel work:** the account-deletion cleanup is a *query-only* sqlc change (Task B-2) — it adds **no** new migration and touches **no** schema, so it cannot collide on the shared dev DB (5434). If a future schema change is ever needed, gate it behind `ZETA_DB_PORT` per the shared-DB-collision memo.
- **WSL tooling** for all builds/tests (see Shell above).
- **No secrets in logs:** the delete handler logs `user_id` only — never tokens, emails, or WorkOS API keys.

---

## FILE STRUCTURE

### Backend (account deletion — net-new)
| File | Created/Modified | Responsibility |
| --- | --- | --- |
| `db/queries/users.sql` | Modified | Add the account-scrub queries: `DeleteUserPreferences :exec`, `DeleteUserDevices :exec`, `DeleteUserNotifications :exec`, `AnonymizeUserReviewAuthorship :exec` (one `:exec` per user-owned table — see B-2's enumeration). All are query-only; no schema change. |
| `internal/db/querier.go`, `internal/db/users.sql.go`, `internal/db/mocks/mock_querier.go` | Modified (generated) | sqlc + mockgen output for the new query. Never hand-edit. |
| `internal/auth/workos.go` | Modified | Add `DeleteUser(ctx, usermanagement.DeleteUserOpts) error` to the `UserManagement` interface + the `workosClient` passthrough. |
| `internal/auth/mocks/mock_workos.go` | Modified (generated) | mockgen output for the new interface method. Never hand-edit. |
| `internal/auth/handler.go` | Modified | New `DeleteMe` handler: scrubs local user data, deletes the WorkOS user, returns 204. |
| `internal/auth/handler_test.go` | Modified | Unit tests for `DeleteMe` (success 204, WorkOS failure 500, unauthenticated 401). |
| `internal/api/server.go` | Modified | Register `r.Delete("/auth/me", authHandler.DeleteMe)` inside the protected group. |

### Contract + mobile data layer
| File | Created/Modified | Responsibility |
| --- | --- | --- |
| `docs/openapi.yaml` | Modified | Add `delete:` to the `/auth/me` path item (`operationId: deleteMe`, 204). |
| `mobile/src/api/schema.d.ts` | Modified (generated) | openapi-typescript output exposing the `deleteMe` operation. Never hand-edit. |
| `mobile/src/api/queries/account.ts` | **Created** | `useDeleteAccountMutation` hook (injectable `Deleter`, throws on error, clears the query cache). |
| `mobile/src/api/queries/account.test.tsx` | **Created** | Hook tests (DELETE call shape, success, error throw). |

### Mobile screens + auth
| File | Created/Modified | Responsibility |
| --- | --- | --- |
| `mobile/src/auth/auth-store.ts` | Modified | Add `deleteAccount()` store action: DELETE `/auth/me`, then local sign-out (clear tokens + cache + flip to `signedOut`). |
| `mobile/src/app/(tabs)/profile.tsx` | Modified | Add the shared **`ZDangerZoneCard`** (WP-UI0) wired to `deleteAccount()`, plus the inline-banner failure state. Reuses the same destructive-action card as group-delete — no hand-styled danger border, no inline `Trash2`. |
| `mobile/src/__tests__/profile-screen.test.tsx` | Modified | Test: delete button opens the confirm dialog; confirm calls the store action. |
| `mobile/src/auth/apple.ts` | **Created** | `isAppleSignInAvailable()` + `signInWithApple()` — wraps `expo-apple-authentication` and runs the WorkOS AuthKit PKCE exchange with `provider: 'apple'`. |
| `mobile/src/auth/apple.test.ts` | **Created** | Unit tests for `signInWithApple` (availability gate, success → `signIn`, cancel → no-op). |
| `mobile/src/app/login.tsx` | Modified | Render Apple's `AppleAuthenticationButton` (iOS-only, availability-gated) beneath the existing "Sign in" button. |
| `mobile/src/__tests__/login-screen.test.tsx` | Modified | Test: Apple button renders on iOS when available and is hidden otherwise. |

### i18n
| File | Created/Modified | Responsibility |
| --- | --- | --- |
| `web/dashboard-next/public/i18n/{en,de,fr}.json` | Modified | Source of truth: add `preferences.deleteAccount*` + `login.apple*` keys. |
| `mobile/src/i18n/locales/{en,de,fr}.json` | Modified (synced) | Refreshed via `pnpm --dir mobile run sync:i18n`; re-add mobile-only keys after. |

### Release config
| File | Created/Modified | Responsibility |
| --- | --- | --- |
| `.env.example` | Modified | Uncomment/document `EXPO_ACCESS_TOKEN` as a required-in-prod backend secret. |
| `.github/workflows/deploy-prod.yml`, `.github/workflows/deploy-dev.yml` | Modified | Add `EXPO_ACCESS_TOKEN=<secret-id>:latest` to the `--set-secrets` flag. |
| `mobile/app.json` | Modified | Add `expo-apple-authentication` plugin + `usesAppleSignIn: true`. (The `expo-notifications` plugin is **not** added here — it is owned by the push plan `20260613191948` Task B1.) |
| `mobile/eas.json` | Unchanged | (Docs-only) FCM/APNs credentials live in EAS credentials, referenced automatically by `eas build` — no file edit. |
| `.agents/reports/<ts>_wp8_release_checklist.md` | **Created** | Human-run checklist: WorkOS Apple provider, GCP secret creation, EAS credential upload. |

---

## UI Parity & Component Reuse

No web counterpart exists for either account deletion or Sign-in-with-Apple (the web dashboard uses WorkOS's hosted AuthKit page, which renders provider buttons server-side). Per `mobile/AGENTS.md` "No web counterpart? follow and cite a named external spec," each element below maps to an **existing z-\* primitive** or a **justified external-spec exception** — no new domain components are invented.

| Screen | Element | Reuses (path) / New + justification |
| --- | --- | --- |
| `profile.tsx` (Danger Zone) | Whole destructive card (icon tile + title/description + danger trigger + confirm dialog) | **Reuse** the shared **`ZDangerZoneCard`** (WP-UI0) — `mobile/src/components/ui/z-danger-zone-card.tsx`. The single destructive-action card; composes `ZCard` + `ZIconTile(tone='danger', AlertTriangle)` + `ZButton(variant='danger')` wired to `ZConfirmDialog(tone='danger')`. **Same component as group-delete (WP5)** so account-delete looks identical. No hand-styled `ZCard` + opacity-danger border, no inline `Trash2`, no one-off danger-border token. |
| `profile.tsx` | In-flight state | **Reuse** `ZDangerZoneCard`'s `loading` prop (disables/spins the action + confirm while the delete mutation is in flight). |
| `profile.tsx` | Delete failure feedback | **Reuse** the shared inline-banner convention — inline `accessibilityRole="alert"` danger text (`text-sm font-medium text-z-danger`) rendered above the card, identical to this file's existing `saveFailed` banner. Mutation feedback rule: destructive confirm → `ZDangerZoneCard`'s `ZConfirmDialog`; save/delete failure → inline banner (never a toast for the failure path). |
| `login.tsx` | Apple sign-in button | **New, JUSTIFIED non-z-\* exception:** Apple's `AppleAuthenticationButton` from `expo-apple-authentication`. **Apple HIG ("Sign in with Apple" › Buttons) and App Store Review Guideline 4.8 *require* Apple's own button styling** — a hand-styled `ZButton` would be a rejection risk. This is the only sanctioned raw-control exception; it is placed consistently directly below the existing primary "Sign in" `ZButton`, full-width, matching the card's button column. Not flagged SHARED (login-only, iOS-only). |
| `login.tsx` | Existing WorkOS "Sign in" button | **Reuse** unchanged `ZButton` — `mobile/src/components/ui/z-button.tsx`. |

**Header treatment:** `profile.tsx` is the Profile tab — it already uses the established form/card layout (header `ZCard` + tabs); the Danger-Zone card appends to that existing column. No FAB, no new header. `login.tsx` is a centered auth card (`ZScreen` + `ZCard`), not a list/detail/form-wizard screen, so the header rules do not apply — the Apple button joins the existing button column.

**New components introduced:** none in `mobile/src/components/` by this plan. The Danger-Zone card is the shared **`ZDangerZoneCard`** introduced and tested by WP-UI0 (`20260613233000_mobile_shared_ui_foundation.md`) — this plan only consumes it, so no primitive test is added here. The only non-z-\* control is Apple's mandated `AppleAuthenticationButton` (external-spec exception, not a Zeta component). Beyond that, no new shared z-\* primitive, so no new primitive test is required beyond the screen/hook tests below.

---

## Phase B — Tasks

> Naming: Tasks are prefixed `B-N` (Phase B of WP8). B-1..B-4 are collision-free (backend + contract + hook). B-5 onward touch `src/app/**` — gate on the parallel session.

### Task B-1 — Verify absence, then add the WorkOS `DeleteUser` interface method

**Files:** `internal/auth/workos.go`, `internal/auth/mocks/mock_workos.go` (generated).

- [ ] **Prove the endpoint does not already exist** (Shape S step 1 audit — account deletion is net-new). Run:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -rniE 'delete.?account|deleteMe|DeleteCurrentUser|DeleteUser' internal/ docs/openapi.yaml"
  ```
  Expect: **no handler/route/contract match** (the only hits, if any, are this plan's future additions or the WorkOS SDK import — confirm there is no `func (h *Handler) DeleteMe`, no `r.Delete("/auth/me"...)`, and no `operationId: deleteMe`). This confirms the net-new backend task is warranted.
- [ ] Confirm the WorkOS SDK signature (already verified during planning; re-confirm): `usermanagement.DeleteUser(ctx, usermanagement.DeleteUserOpts{User: string}) error`, where `DeleteUserOpts` is `{ User string }`. Source: `~/go/pkg/mod/github.com/workos/workos-go/v4@v4.46.1/pkg/usermanagement/{usermanagement.go,client.go}`.
- [ ] **Add the method to the interface + passthrough** in `internal/auth/workos.go`. Add to the `UserManagement` interface (after `UpdateUser`):
  ```go
  DeleteUser(ctx context.Context, opts usermanagement.DeleteUserOpts) error
  ```
  Add the passthrough implementation (after the `UpdateUser` method on `*workosClient`):
  ```go
  func (w *workosClient) DeleteUser(ctx context.Context, opts usermanagement.DeleteUserOpts) error {
  	return usermanagement.DeleteUser(ctx, opts)
  }
  ```
- [ ] **Regenerate the mock** (mockgen reads the `//go:generate` directive at the top of `workos.go`):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta/internal/auth && ~/go/bin/mockgen -source=workos.go -destination=mocks/mock_workos.go -package=mocks"
  ```
- [ ] Verify the mock now has `DeleteUser`:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -c 'DeleteUser' internal/auth/mocks/mock_workos.go"
  ```
  Expect: `>= 2` (the mock method + its recorder).
- [ ] Compile-check (no behavioral test yet — the handler that uses it lands in B-3):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && /usr/local/go/bin/go build ./internal/auth/..."
  ```
  Expect: exit 0, no output.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add internal/auth/workos.go internal/auth/mocks/mock_workos.go && git commit -m 'feat(auth): add WorkOS DeleteUser to UserManagement interface'"
  ```

### Task B-2 — sqlc queries: full account scrub (every user-owned table)

**Files:** `db/queries/users.sql`, generated `internal/db/{querier.go,users.sql.go,mocks/mock_querier.go}`.

> **Deletion-completeness audit (verified against `db/migrations/*.up.sql`).** There is **no `users` table and no FK to a user identity** — every user-keyed column is a bare `TEXT` WorkOS id, so **a user delete produces zero database cascades.** Deleting only `user_preferences` would orphan rows (and PII) across the schema. Each user-owned table below is therefore either **scrubbed** (delete/anonymize) or **retained with a stated rationale**. PII the user directly authored (`user_preferences.first_name/last_name`, device tokens, notification payloads, review author identity) is removed; shared/relational records that other members still depend on are anonymized or retained so the delete cannot corrupt other accounts' data.
>
> | Table (column) | Migration | Decision | Why |
> | --- | --- | --- | --- |
> | `user_preferences` (`user_id` PK; holds name/avatar/timezone/email+push prefs) | `20260127175500`, `…604160000` | **Delete** (`DeleteUserPreferences`) | The canonical local PII row. |
> | `user_devices` (`user_id`) | `20260613100000` | **Delete all for the user** (`DeleteUserDevices`) | Expo push tokens are personal device identifiers. The existing `DeleteDevice`/`DeleteDeviceByToken` are single-token scoped — neither removes a user's full device set, so this new query is required. |
> | `notifications` (`recipient_id`) | `20260605120500` | **Delete** (`DeleteUserNotifications`) | The user's personal inbox; payloads can name them. |
> | `video_reviews` (`author_id`) | `20260604160000` | **Anonymize** (`AnonymizeUserReviewAuthorship` → set `author_id = NULL`) | Comments belong to a shared video thread other members still read; deleting them would tear holes in conversations. Author name/avatar are resolved by `LEFT JOIN user_preferences`, which is already gone, so nulling `author_id` removes the identity link while preserving thread integrity. |
> | `groups` (`owner_id`), `user_groups` (`user_id`), `group_invitations` (`inviter_id`) | `20260125000000` | **Retain (documented)** | Groups are shared org structures co-owned by other members; auto-deleting a group on owner deletion would destroy other users' assets/reviews/bookings (FK `ON DELETE CASCADE` to groups). Group ownership transfer/teardown is an **admin/offboarding follow-up**, not part of the self-serve in-app delete. The `owner_id`/`inviter_id`/`user_id` strings are opaque WorkOS ids with no stored PII once `user_preferences` is gone. |
> | `assets` (`owner_id`) + `videos`/`video_reviews` under them | `20260126190000`, `20260122000001` | **Retain (documented)** | Uploaded videos live inside a group other members review; removing them would delete shared coaching content and cascade away other members' review threads. Media lifecycle (Mux deletion) is a separate data-retention follow-up. `owner_id` is an opaque id; the PII (name/avatar) is gone with `user_preferences`. |
> | `coaching_*` (`expert_id`/`student_id`/`cancelled_by`) | `20260403000001` | **Retain (documented)** | Bookings/availability are bilateral records the counterparty still needs (history, no-show accounting). Ids are opaque; `notes` is coach-authored about the session, not viewer PII. Counterparty-facing teardown is an offboarding follow-up. |
>
> **Net:** the four scrub queries below remove all rows that store this user's PII or are personal to them; the retained tables hold only opaque WorkOS ids (PII removed) and are kept to avoid corrupting other accounts' shared data. The retention items are recorded as follow-ups in the WP8 checklist (B-12) so an admin offboarding path can be built later. This keeps B-2 **query-only** (no migration, no schema change → no shared-DB collision).

- [ ] Append the four scrub queries to `db/queries/users.sql` (after `UpdateUserAvatar`):
  ```sql
  -- name: DeleteUserPreferences :exec
  DELETE FROM user_preferences WHERE user_id = $1;

  -- name: DeleteUserDevices :exec
  DELETE FROM user_devices WHERE user_id = $1;

  -- name: DeleteUserNotifications :exec
  DELETE FROM notifications WHERE recipient_id = $1;

  -- name: AnonymizeUserReviewAuthorship :exec
  UPDATE video_reviews SET author_id = NULL WHERE author_id = $1;
  ```
- [ ] Regenerate sqlc:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && ~/go/bin/sqlc generate"
  ```
- [ ] Regenerate the Querier mock so `DeleteUserPreferences` is mockable in the handler test (mockgen directive lives on the `Querier` interface — find it and re-run, or use the project's mock target). Confirm the directive:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -rn 'go:generate mockgen' internal/db/"
  ```
  Then run the exact command that directive specifies (it generates `internal/db/mocks/mock_querier.go`). Verify all four new methods are present:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && for m in DeleteUserPreferences DeleteUserDevices DeleteUserNotifications AnonymizeUserReviewAuthorship; do echo -n \"\$m: \"; grep -c \"\$m\" internal/db/querier.go internal/db/mocks/mock_querier.go | paste -sd' '; done"
  ```
  Expect, for each: `internal/db/querier.go:1` (interface method) and `internal/db/mocks/mock_querier.go:2` (method + recorder).
- [ ] Compile-check:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && /usr/local/go/bin/go build ./internal/db/..."
  ```
  Expect: exit 0.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add db/queries/users.sql internal/db/ && git commit -m 'feat(db): add account-scrub queries (prefs, devices, notifications, review anonymize)'"
  ```

### Task B-3 — Backend handler: `DeleteMe` (test-first)

**Files:** `internal/auth/handler.go`, `internal/auth/handler_test.go`.

The handler must: require auth; scrub **all** of the caller's local data per the B-2 audit — `DeleteUserPreferences`, `DeleteUserDevices`, `DeleteUserNotifications`, then `AnonymizeUserReviewAuthorship` — then delete the WorkOS user (the auth source of truth — irreversible, satisfies 5.1.1(v)); return **204**. Order matters: run **all** local scrubs first and the WorkOS delete **last**, so any local failure aborts before the irreversible WorkOS delete (no half-deleted account where the identity is gone but PII rows survive). On any local-scrub error, return 500 and stop. Existing handler conventions: `GetUser(ctx)`, `http.Error` with status, `slog` with `component:"auth"` + `user_id`, `err` field on errors. **Never log tokens/email.**

- [ ] **Write the failing tests** in `internal/auth/handler_test.go` (append; mirror the existing gomock/httptest style — `NewHandler(slog.Default(), q, workos)`, `withTestUser` via `context.WithValue(ctx, UserKey, ...)` as used by `Me`/`UpdateMe` tests):
  ```go
  func TestDeleteMeDeletesLocalDataThenWorkOSUser(t *testing.T) {
  	ctrl := gomock.NewController(t)
  	q := dbmocks.NewMockQuerier(ctrl)
  	workos := authmocks.NewMockUserManagement(ctrl)
  	h := NewHandler(slog.Default(), q, workos)

  	gomock.InOrder(
  		q.EXPECT().DeleteUserPreferences(gomock.Any(), "user-1").Return(nil),
  		q.EXPECT().DeleteUserDevices(gomock.Any(), "user-1").Return(nil),
  		q.EXPECT().DeleteUserNotifications(gomock.Any(), "user-1").Return(nil),
  		q.EXPECT().AnonymizeUserReviewAuthorship(gomock.Any(), pgtype.Text{String: "user-1", Valid: true}).Return(nil),
  		workos.EXPECT().DeleteUser(gomock.Any(), usermanagement.DeleteUserOpts{User: "user-1"}).Return(nil),
  	)

  	req := httptest.NewRequest(http.MethodDelete, "/auth/me", nil)
  	req = req.WithContext(context.WithValue(req.Context(), UserKey, &UserContext{ID: "user-1"}))
  	rec := httptest.NewRecorder()

  	h.DeleteMe(rec, req)

  	if rec.Code != http.StatusNoContent {
  		t.Fatalf("got status %d, want %d; body: %s", rec.Code, http.StatusNoContent, rec.Body.String())
  	}
  }

  func TestDeleteMeReturns500WhenWorkOSDeleteFails(t *testing.T) {
  	ctrl := gomock.NewController(t)
  	q := dbmocks.NewMockQuerier(ctrl)
  	workos := authmocks.NewMockUserManagement(ctrl)
  	h := NewHandler(slog.Default(), q, workos)

  	// All local scrubs succeed; only the final WorkOS delete fails.
  	q.EXPECT().DeleteUserPreferences(gomock.Any(), "user-1").Return(nil)
  	q.EXPECT().DeleteUserDevices(gomock.Any(), "user-1").Return(nil)
  	q.EXPECT().DeleteUserNotifications(gomock.Any(), "user-1").Return(nil)
  	q.EXPECT().AnonymizeUserReviewAuthorship(gomock.Any(), gomock.Any()).Return(nil)
  	workos.EXPECT().DeleteUser(gomock.Any(), gomock.Any()).Return(fmt.Errorf("workos boom"))

  	req := httptest.NewRequest(http.MethodDelete, "/auth/me", nil)
  	req = req.WithContext(context.WithValue(req.Context(), UserKey, &UserContext{ID: "user-1"}))
  	rec := httptest.NewRecorder()

  	h.DeleteMe(rec, req)

  	if rec.Code != http.StatusInternalServerError {
  		t.Fatalf("got status %d, want %d", rec.Code, http.StatusInternalServerError)
  	}
  }

  func TestDeleteMeRequiresAuth(t *testing.T) {
  	h := NewHandler(slog.Default(), nil, nil)
  	req := httptest.NewRequest(http.MethodDelete, "/auth/me", nil)
  	rec := httptest.NewRecorder()

  	h.DeleteMe(rec, req)

  	if rec.Code != http.StatusUnauthorized {
  		t.Fatalf("got status %d, want %d", rec.Code, http.StatusUnauthorized)
  	}
  }
  ```
  (`fmt`, `usermanagement`, and the mock packages are already imported in `handler_test.go`. **Add one import:** `"github.com/jackc/pgx/v5/pgtype"` — needed for the `AnonymizeUserReviewAuthorship` arg, since `author_id` is a nullable `TEXT` and sqlc maps it to `pgtype.Text` in this pgx-based repo, **not** `sql.NullString`. Construct it as `pgtype.Text{String: "user-1", Valid: true}`, matching `internal/reviews/handler.go:276`. If the linter flags an unused import, that signals a typo — fix the test, not the import list.)
- [ ] **Run the tests, expect FAIL** (compile error — `h.DeleteMe` undefined):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && /usr/local/go/bin/go test ./internal/auth/ -run TestDeleteMe 2>&1 | tail -20"
  ```
  Expect output containing: `h.DeleteMe undefined (type *Handler has no field or method DeleteMe)` → build failed.
- [ ] **Write the minimal handler** in `internal/auth/handler.go` (add after `UpdateMe`):
  (Add the `"github.com/jackc/pgx/v5/pgtype"` import to `handler.go` if it is not already present — it is needed for the `AnonymizeUserReviewAuthorship` arg.)
  ```go
  // DeleteMe permanently deletes the authenticated user's account: it scrubs all
  // of the user's local data (preferences, devices, notifications) and anonymizes
  // their review authorship, then deletes the WorkOS user (irreversible). Local
  // scrubs run first so a local failure aborts before the irreversible WorkOS
  // delete, never leaving a half-deleted account. Retained tables (groups, assets,
  // coaching bookings) hold only opaque WorkOS ids once preferences are gone — see
  // the B-2 deletion-completeness audit and the WP8 checklist offboarding follow-up.
  // Satisfies App Store Review Guideline 5.1.1(v) — in-app account deletion.
  func (h *Handler) DeleteMe(w http.ResponseWriter, r *http.Request) {
  	ctx := r.Context()
  	user := GetUser(ctx)
  	if user == nil {
  		http.Error(w, "Unauthorized", http.StatusUnauthorized)
  		return
  	}

  	// Each local scrub aborts the whole delete on error (before the irreversible
  	// WorkOS delete). event is the stable snake_case event name for the log.
  	scrub := func(event string, run func() error) bool {
  		if err := run(); err != nil {
  			h.logger.ErrorContext(ctx, event,
  				slog.String("component", "auth"),
  				slog.String("user_id", user.ID),
  				slog.Any("err", err),
  			)
  			http.Error(w, "Failed to delete account", http.StatusInternalServerError)
  			return false
  		}
  		return true
  	}

  	if !scrub("auth_delete_local_prefs_failed", func() error {
  		return h.q.DeleteUserPreferences(ctx, user.ID)
  	}) {
  		return
  	}
  	if !scrub("auth_delete_devices_failed", func() error {
  		return h.q.DeleteUserDevices(ctx, user.ID)
  	}) {
  		return
  	}
  	if !scrub("auth_delete_notifications_failed", func() error {
  		return h.q.DeleteUserNotifications(ctx, user.ID)
  	}) {
  		return
  	}
  	if !scrub("auth_anonymize_reviews_failed", func() error {
  		return h.q.AnonymizeUserReviewAuthorship(ctx, pgtype.Text{String: user.ID, Valid: true})
  	}) {
  		return
  	}

  	if err := h.workos.DeleteUser(ctx, usermanagement.DeleteUserOpts{User: user.ID}); err != nil {
  		h.logger.ErrorContext(ctx, "auth_delete_workos_user_failed",
  			slog.String("component", "auth"),
  			slog.String("user_id", user.ID),
  			slog.Any("err", err),
  		)
  		http.Error(w, "Failed to delete account", http.StatusInternalServerError)
  		return
  	}

  	h.logger.InfoContext(ctx, "auth_account_deleted",
  		slog.String("component", "auth"),
  		slog.String("user_id", user.ID),
  	)
  	w.WriteHeader(http.StatusNoContent)
  }
  ```
- [ ] **Run the tests, expect PASS:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && /usr/local/go/bin/go test ./internal/auth/ -run TestDeleteMe -v 2>&1 | tail -20"
  ```
  Expect: `PASS` for all three `TestDeleteMe*`.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add internal/auth/handler.go internal/auth/handler_test.go && git commit -m 'feat(auth): add DeleteMe handler for in-app account deletion'"
  ```

### Task B-4 — Register the route + surface into the contract

**Files:** `internal/api/server.go`, `docs/openapi.yaml`.

- [ ] **Register the route** in `internal/api/server.go`, inside the protected group, beside the existing `/auth/me` routes. Locate:
  ```go
  		r.Get("/auth/me", authHandler.Me)
  		r.Put("/auth/me", authHandler.UpdateMe)
  ```
  and add directly beneath:
  ```go
  		r.Delete("/auth/me", authHandler.DeleteMe)
  ```
  ⚠️ Note: the existing `/auth/me` GET/PUT are registered in the *auth* `Group` (around line 168) **without** `auth.RequireAuth` because the middleware populates the user from the JWT; the protected group adds `RequireAuth`. Place `Delete("/auth/me", ...)` in the **same group as the existing `/auth/me` GET/PUT** (the auth route group) so it shares their middleware exactly — do not move it into the `/groups`-style protected block. Verify by reading the surrounding 5 lines before editing.
- [ ] **Surface into `docs/openapi.yaml`** — add a `delete:` operation to the existing `/auth/me` path item (after the `put:` block, before `/assets:`):
  ```yaml
    /auth/me:
      get:
        # ... existing ...
      put:
        # ... existing ...
      delete:
        tags: [auth]
        summary: Permanently delete the current user's account
        description: >
          Deletes the authenticated user's local preferences and their WorkOS
          identity. Irreversible. Required for App Store Review Guideline
          5.1.1(v) (in-app account deletion).
        operationId: deleteMe
        responses:
          "204":
            description: Account deleted
          "401":
            description: Not authenticated
          "500":
            description: Deletion failed
  ```
- [ ] **Lint the contract:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && make api:openapi:lint"
  ```
  Expect: 0 errors. (If `make` cannot find tooling, fall back to the lint binary the Makefile invokes — read the `api:openapi:lint` target.)
- [ ] **Regenerate the mobile schema** and confirm the operation exists:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run generate:api && grep -c \"'/auth/me'\" mobile/src/api/schema.d.ts"
  ```
  Expect: schema regenerates; the `delete` operation appears under the `/auth/me` path (re-run is idempotent — a second run produces no diff).
- [ ] Build the API to confirm the route wiring compiles:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && /usr/local/go/bin/go build ./internal/api/..."
  ```
  Expect: exit 0.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add internal/api/server.go docs/openapi.yaml mobile/src/api/schema.d.ts && git commit -m 'feat(auth): register DELETE /auth/me + surface deleteMe in contract'"
  ```

### Task B-5 — Mobile hook: `useDeleteAccountMutation` (test-first)

**Files:** `mobile/src/api/queries/account.ts` (new), `mobile/src/api/queries/account.test.tsx` (new).

Mirror the injectable-client + `Pick` pattern from `groups.ts`/`invitations.ts`. DELETE returns 204 (no body) → treat `error === undefined` as success, like `useLeaveGroupMutation`. Clearing the cache is the store's job (B-6), so this hook does **not** invalidate keys — but it accepts an injectable client for testing.

- [ ] **Write the failing test** `mobile/src/api/queries/account.test.tsx` (mirror `groups.test.tsx` — `expo-secure-store` mock, `QueryClientProvider` wrapper, `renderHook`):
  ```tsx
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
  import { renderHook } from '@testing-library/react-native';
  import type { ReactNode } from 'react';

  jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
  }));

  import { useDeleteAccountMutation } from './account';

  let client: QueryClient;
  beforeEach(() => {
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });
  afterEach(() => client.clear());

  function wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  test('useDeleteAccountMutation calls DELETE /auth/me', async () => {
    const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
    const { result } = await renderHook(
      () => useDeleteAccountMutation({ DELETE } as never),
      { wrapper },
    );
    await result.current.mutateAsync();
    // The hook calls DELETE with a single path arg (no options), so assert that
    // exact shape — asserting a trailing `undefined` would fail (the arg is
    // absent, not passed as undefined).
    expect(DELETE).toHaveBeenCalledWith('/auth/me');
  });

  test('useDeleteAccountMutation throws when the API errors', async () => {
    const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
    const { result } = await renderHook(
      () => useDeleteAccountMutation({ DELETE } as never),
      { wrapper },
    );
    await expect(result.current.mutateAsync()).rejects.toThrow();
  });
  ```
- [ ] **Run, expect FAIL** (module not found):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/account.test.tsx 2>&1 | tail -20"
  ```
  Expect: `Cannot find module './account'`.
- [ ] **Write the hook** `mobile/src/api/queries/account.ts`:
  ```ts
  import { useMutation } from '@tanstack/react-query';
  import { api } from '../../auth/auth-store';

  type Deleter = Pick<typeof api, 'DELETE'>;

  /**
   * Permanently deletes the current user's account via DELETE /auth/me.
   * 204 returns no body — treat error === undefined as success (mirrors
   * useLeaveGroupMutation). Cache/sign-out cleanup is handled by the auth
   * store's deleteAccount action, not here.
   */
  export function useDeleteAccountMutation(client: Deleter = api) {
    return useMutation({
      mutationFn: async () => {
        const { error } = await (client as typeof api).DELETE('/auth/me');
        if (error !== undefined) throw new Error('Failed to delete account');
      },
    });
  }
  ```
- [ ] **Run, expect PASS:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/api/queries/account.test.tsx 2>&1 | tail -20"
  ```
  Expect: 2 passing.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/api/queries/account.ts mobile/src/api/queries/account.test.tsx && git commit -m 'feat(mobile): add useDeleteAccountMutation hook'"
  ```

### Task B-6 — Auth store `deleteAccount()` action (test-first)

**Files:** `mobile/src/auth/auth-store.ts`, and a co-located store test (extend the existing auth-store test if present, else create `mobile/src/auth/auth-store.test.ts`). First locate the existing store test:
```bash
wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && ls mobile/src/auth/*.test.* 2>/dev/null"
```
Reuse it if it exists; otherwise create `mobile/src/auth/auth-store.test.ts`.

The action: call DELETE `/auth/me` via the store's injectable client, then perform the same local teardown as `signOut` (clear tokens, clear the query cache, flip to `signedOut`). On API failure, do **not** sign out — return `false` so the UI can show an error.

- [ ] **Add `deleteAccount` to the `AuthenticatedClientLike` Pick and the `AuthState` type** in `auth-store.ts`:
  - Change `export type AuthenticatedClientLike = Pick<AuthenticatedClient, 'GET' | 'PUT'>;` to `Pick<AuthenticatedClient, 'GET' | 'PUT' | 'DELETE'>`.
  - Add to `AuthState`:
    ```ts
    /**
     * Permanently deletes the account via DELETE /auth/me, then tears down the
     * local session (clear tokens + query cache, flip to signedOut). Returns
     * true on success; false (session preserved) on API failure.
     */
    deleteAccount: () => Promise<boolean>;
    ```
- [ ] **Write the failing test** (in the located/created store test):
  ```ts
  import { createAuthStore } from './auth-store';

  jest.mock('expo-secure-store', () => ({
    getItemAsync: jest.fn(async () => null),
    setItemAsync: jest.fn(async () => undefined),
    deleteItemAsync: jest.fn(async () => undefined),
  }));

  test('deleteAccount signs out locally on success', async () => {
    const DELETE = jest.fn(async () => ({ data: undefined, error: undefined }));
    const store = createAuthStore({ GET: jest.fn(), PUT: jest.fn(), DELETE } as never);
    store.setState({ status: 'signedIn', user: { id: 'u1' } as never });

    const ok = await store.getState().deleteAccount();

    expect(ok).toBe(true);
    expect(DELETE).toHaveBeenCalledWith('/auth/me');
    expect(store.getState().status).toBe('signedOut');
    expect(store.getState().user).toBeNull();
  });

  test('deleteAccount preserves the session on API failure', async () => {
    const DELETE = jest.fn(async () => ({ data: undefined, error: { message: 'boom' } }));
    const store = createAuthStore({ GET: jest.fn(), PUT: jest.fn(), DELETE } as never);
    store.setState({ status: 'signedIn', user: { id: 'u1' } as never });

    const ok = await store.getState().deleteAccount();

    expect(ok).toBe(false);
    expect(store.getState().status).toBe('signedIn');
  });
  ```
- [ ] **Run, expect FAIL** (`deleteAccount` is not a function):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/auth/auth-store.test 2>&1 | tail -20"
  ```
  Expect: `store.getState().deleteAccount is not a function` (or TS compile error on the unknown member).
- [ ] **Implement** in the `createAuthStore` returned object (after `signOut`), using the same teardown as `signOut`:
  ```ts
  deleteAccount: async () => {
    const { error } = await api.DELETE('/auth/me' as never);
    if (error !== undefined) return false;
    await clearTokens();
    queryClient.clear();
    set({ status: 'signedOut', user: null });
    return true;
  },
  ```
  (Note: the module-level `api` client already includes `DELETE`; the `AuthenticatedClientLike` widening above lets injected test doubles type-check.)
- [ ] **Run, expect PASS:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/auth/auth-store.test 2>&1 | tail -20"
  ```
  Expect: 2 passing.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/auth/auth-store.ts mobile/src/auth/auth-store.test.ts && git commit -m 'feat(mobile): add deleteAccount auth-store action'"
  ```

### Task B-7 — i18n: account-deletion + Apple keys (web source → sync)

**Files:** `web/dashboard-next/public/i18n/{en,de,fr}.json` (source), then synced `mobile/src/i18n/locales/{en,de,fr}.json`.

⚠️ `sync:i18n` is **destructive** — it drops mobile-only keys (per the i18n-sync-drift memo, e.g. `sessions.call.sessionFallback`). After syncing, re-add any mobile-only keys by hand from git.

- [ ] **Add to the `preferences` namespace** in each of `web/dashboard-next/public/i18n/{en,de,fr}.json` (sibling to the existing `preferences.saveFailed`). English values:
  ```json
  "deleteAccountTitle": "Delete account",
  "deleteAccountDescription": "Permanently delete your account and all associated data. This cannot be undone.",
  "deleteAccountButton": "Delete my account",
  "deleteAccountConfirmTitle": "Delete your account?",
  "deleteAccountConfirmBody": "This permanently removes your profile, preferences, and access. This action cannot be undone.",
  "deleteAccountConfirm": "Delete account",
  "deleteAccountFailed": "Failed to delete your account. Please try again.",
  ```
  German (`de.json`):
  ```json
  "deleteAccountTitle": "Konto löschen",
  "deleteAccountDescription": "Löschen Sie Ihr Konto und alle zugehörigen Daten dauerhaft. Dies kann nicht rückgängig gemacht werden.",
  "deleteAccountButton": "Mein Konto löschen",
  "deleteAccountConfirmTitle": "Konto wirklich löschen?",
  "deleteAccountConfirmBody": "Dadurch werden Ihr Profil, Ihre Einstellungen und Ihr Zugang dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.",
  "deleteAccountConfirm": "Konto löschen",
  "deleteAccountFailed": "Konto konnte nicht gelöscht werden. Bitte versuchen Sie es erneut.",
  ```
  French (`fr.json`):
  ```json
  "deleteAccountTitle": "Supprimer le compte",
  "deleteAccountDescription": "Supprimez définitivement votre compte et toutes les données associées. Cette action est irréversible.",
  "deleteAccountButton": "Supprimer mon compte",
  "deleteAccountConfirmTitle": "Supprimer votre compte ?",
  "deleteAccountConfirmBody": "Cela supprime définitivement votre profil, vos préférences et votre accès. Cette action est irréversible.",
  "deleteAccountConfirm": "Supprimer le compte",
  "deleteAccountFailed": "Échec de la suppression de votre compte. Veuillez réessayer.",
  ```
- [ ] **Add a new top-level `login` namespace** in each web JSON (the login screen currently has no `login.*` keys — see the literals in `login.tsx`). English:
  ```json
  "login": {
    "heading": "Sign in to continue",
    "description": "Digital video coaching — sign in to review and record sessions.",
    "signIn": "Sign in",
    "failed": "Sign-in failed. Please try again.",
    "apple": "Sign in with Apple"
  }
  ```
  German:
  ```json
  "login": {
    "heading": "Zum Fortfahren anmelden",
    "description": "Digitales Video-Coaching – melden Sie sich an, um Sitzungen zu prüfen und aufzunehmen.",
    "signIn": "Anmelden",
    "failed": "Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    "apple": "Mit Apple anmelden"
  }
  ```
  French:
  ```json
  "login": {
    "heading": "Connectez-vous pour continuer",
    "description": "Coaching vidéo numérique — connectez-vous pour analyser et enregistrer des sessions.",
    "signIn": "Se connecter",
    "failed": "Échec de la connexion. Veuillez réessayer.",
    "apple": "Se connecter avec Apple"
  }
  ```
- [ ] **Snapshot mobile-only keys before syncing** (so they can be re-added):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git stash list; git diff --stat mobile/src/i18n/locales/ || true"
  ```
  Note any mobile-only keys (the memo names `sessions.call.sessionFallback`).
- [ ] **Sync:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile run sync:i18n"
  ```
- [ ] **Re-add dropped mobile-only keys** by hand into `mobile/src/i18n/locales/{en,de,fr}.json` (compare against the pre-sync git version: `git diff mobile/src/i18n/locales/en.json` and restore any removed mobile-only key such as `sessions.call.sessionFallback`).
- [ ] Verify the new keys landed in mobile:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -c 'deleteAccountTitle' mobile/src/i18n/locales/en.json mobile/src/i18n/locales/de.json mobile/src/i18n/locales/fr.json && grep -c '\"apple\"' mobile/src/i18n/locales/en.json"
  ```
  Expect: `1` for each.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add web/dashboard-next/public/i18n/ mobile/src/i18n/locales/ && git commit -m 'feat(i18n): add account-deletion + login/apple keys (web source + mobile sync)'"
  ```

### Task B-8 — Profile Danger-Zone delete UI (test-first) ⚠️ gate on parallel session

**Files:** `mobile/src/app/(tabs)/profile.tsx`, `mobile/src/__tests__/profile-screen.test.tsx`.

⚠️ This edits `src/app/**` — **do not start until the user signals the parallel session is done.** **Depends on:** WP-UI0 (`20260613233000_mobile_shared_ui_foundation.md`) — this Task consumes the shared **`ZDangerZoneCard`** primitive (it must exist first).

Add the shared **`ZDangerZoneCard`** (WP-UI0) after the sign-out button inside `PreferencesForm`'s `<View className="gap-4 p-4">` column — the **same** destructive-action card group-delete uses, so account-delete looks identical. `ZDangerZoneCard` composes `ZCard` + `ZIconTile(tone='danger', AlertTriangle)` + a danger `ZButton` wired to its own internal `ZConfirmDialog(tone='danger')`; the screen passes only props (no hand-styled border, no inline `Trash2`, no one-off `z-danger/30` token, no locally-managed dialog `visible` state). Its `onAction` calls `authStore.getState().deleteAccount()`; `loading` disables/spins the action + confirm while in flight. Failure shows an inline `accessibilityRole="alert"` danger banner above the card (the shared inline-banner convention — identical to this file's existing `saveFailed` banner). On success the store flips to `signedOut` and the root layout routes to login — no manual navigation.

**`ZDangerZoneCard` props (WP-UI0):** `{ title, description, actionLabel, onAction, loading?, disabled?, confirmTitle, confirmMessage, confirmLabel, testID? }`.

- [ ] **Write the failing test** in `mobile/src/__tests__/profile-screen.test.tsx` (read the file first for its existing mocks/setup, then append). Use the established RNTL style (`render` is async; `userEvent`):
  ```tsx
  test('delete account: button opens the danger dialog and confirm calls deleteAccount', async () => {
    const user = userEvent.setup();
    const deleteAccount = jest.fn(async () => true);
    authStore.setState({
      status: 'signedIn',
      user: { id: 'u1', first_name: 'A', last_name: 'B', email: 'a@b.c', language: 'en',
        avatar: '', timezone: 'UTC', role: 'student', permissions: [],
        email_preferences: {} as never, push_preferences: {} as never } as never,
    });
    jest.spyOn(authStore.getState(), 'deleteAccount').mockImplementation(deleteAccount);

    await render(<ProfileScreen />);
    await user.press(screen.getByText('Delete my account'));
    // Confirm button inside the danger dialog:
    await user.press(screen.getByText('Delete account'));

    await waitFor(() => expect(deleteAccount).toHaveBeenCalled());
  });
  ```
  (If the existing test file already exposes a `renderProfile()` helper / store seed, reuse it instead of re-seeding the user inline.)
- [ ] **Run, expect FAIL** (no "Delete my account" text yet):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/profile-screen.test.tsx 2>&1 | tail -25"
  ```
  Expect: `Unable to find an element with text: Delete my account`.
- [ ] **Implement.** In `profile.tsx`: import the shared `ZDangerZoneCard` from `../../components/ui/z-danger-zone-card` (WP-UI0). **Do not** import `Trash2` or `ZConfirmDialog` here — the card owns its icon (`ZIconTile` + `AlertTriangle`) and its confirm dialog internally. Add local state in `PreferencesForm` (no `confirmDelete` — the card manages its own dialog visibility):
  ```tsx
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteFailed(false);
    const ok = await authStore.getState().deleteAccount();
    setDeleting(false);
    if (!ok) setDeleteFailed(true);
    // On success the auth store flips to signedOut; the root layout redirects.
  }
  ```
  Add the shared Danger-Zone card after the sign-out `ZButton`, still inside the `gap-4 p-4` column. The inline failure banner sits **above** the card and reuses the same `accessibilityRole="alert"` + `text-sm font-medium text-z-danger` markup as this file's existing `saveFailed` banner (shared inline-banner convention):
  ```tsx
  {deleteFailed ? (
    <Text accessibilityRole="alert" className="text-sm font-medium text-z-danger">
      {t('preferences.deleteAccountFailed')}
    </Text>
  ) : null}

  <ZDangerZoneCard
    title={t('preferences.deleteAccountTitle')}
    description={t('preferences.deleteAccountDescription')}
    actionLabel={t('preferences.deleteAccountButton')}
    onAction={() => void handleDeleteAccount()}
    loading={deleting}
    confirmTitle={t('preferences.deleteAccountConfirmTitle')}
    confirmMessage={t('preferences.deleteAccountConfirmBody')}
    confirmLabel={t('preferences.deleteAccountConfirm')}
    testID="delete-account-card"
  />
  ```
  (`ZDangerZoneCard` internally renders the danger `ZButton(label=actionLabel)` and a `ZConfirmDialog(tone='danger', confirmLabel)`; it supplies its own cancel label via `common.actions.cancel`. No `colors`/`Trash2` wiring needed in this screen.)
- [ ] **Run, expect PASS:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/profile-screen.test.tsx 2>&1 | tail -25"
  ```
  Expect: all profile-screen tests pass (existing + new).
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add 'mobile/src/app/(tabs)/profile.tsx' mobile/src/__tests__/profile-screen.test.tsx && git commit -m 'feat(mobile): add Danger Zone account deletion to profile'"
  ```

### Task B-9 — Sign-in-with-Apple module (test-first)

**Files:** `mobile/src/auth/apple.ts` (new), `mobile/src/auth/apple.test.ts` (new), `mobile/package.json` (add dep), `mobile/app.json` (plugin).

The WorkOS AuthKit PKCE flow (`expo-auth-session`) already drives the existing button with `extraParams: { provider: 'authkit' }`. For SIWA the *same* AuthKit endpoint is used with `provider: 'apple'` — **no Zeta backend change**. `expo-apple-authentication` is used only to (a) gate availability to iOS devices that support SIWA, satisfying Apple HIG ("offer Sign in with Apple where available"), and (b) render Apple's mandated button (Task B-10). The actual auth still goes through WorkOS so the resulting Zeta session is identical to the existing flow.

> **Design decision (stated for the zero-context engineer):** we do **not** send Apple's native identity token to the backend — that would need a new backend verifier endpoint and a WorkOS native-Apple integration. Instead, pressing Apple's button launches the WorkOS AuthKit web flow pinned to the Apple provider, reusing the exact `promptAsync` → `completeLogin` path the existing button uses. `expo-apple-authentication` only provides the HIG-compliant button + the iOS availability check.

- [ ] **Add the dependency** (use the SDK-56-pinned version via expo install — record the resolved version):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta/mobile && pnpm expo install expo-apple-authentication"
  ```
- [ ] **Write the failing test** `mobile/src/auth/apple.test.ts`:
  ```ts
  jest.mock('expo-apple-authentication', () => ({
    isAvailableAsync: jest.fn(),
    AppleAuthenticationButton: () => null,
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { BLACK: 0 },
  }));

  import * as AppleAuthentication from 'expo-apple-authentication';
  import { isAppleSignInAvailable } from './apple';

  test('isAppleSignInAvailable reflects the native availability check', async () => {
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    expect(await isAppleSignInAvailable()).toBe(true);
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockResolvedValue(false);
    expect(await isAppleSignInAvailable()).toBe(false);
  });

  test('isAppleSignInAvailable returns false if the native check throws', async () => {
    (AppleAuthentication.isAvailableAsync as jest.Mock).mockRejectedValue(new Error('no'));
    expect(await isAppleSignInAvailable()).toBe(false);
  });
  ```
- [ ] **Run, expect FAIL** (module not found):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/auth/apple.test.ts 2>&1 | tail -20"
  ```
  Expect: `Cannot find module './apple'`.
- [ ] **Write** `mobile/src/auth/apple.ts`:
  ```ts
  import * as AppleAuthentication from 'expo-apple-authentication';

  /**
   * True when the device can offer Sign in with Apple (iOS 13+). Apple HIG
   * requires showing the SIWA button only where it is available; on Android
   * and unsupported iOS this resolves false and the caller hides the button.
   */
  export async function isAppleSignInAvailable(): Promise<boolean> {
    try {
      return await AppleAuthentication.isAvailableAsync();
    } catch {
      return false;
    }
  }
  ```
- [ ] **Run, expect PASS:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/auth/apple.test.ts 2>&1 | tail -20"
  ```
  Expect: 2 passing.
- [ ] **Register the plugin** in `mobile/app.json` — add `"expo-apple-authentication"` to the `plugins` array, and set `"usesAppleSignIn": true` inside the `ios` object:
  ```json
  "ios": {
    "icon": "./assets/expo.icon",
    "bundleIdentifier": "com.m4xon.zeta",
    "usesAppleSignIn": true,
    "infoPlist": {
      "NSMicrophoneUsageDescription": "Zeta uses the microphone for live coaching calls."
    }
  }
  ```
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/auth/apple.ts mobile/src/auth/apple.test.ts mobile/app.json mobile/package.json mobile/pnpm-lock.yaml && git commit -m 'feat(mobile): add Apple sign-in availability module + plugin'"
  ```

### Task B-10 — Apple button on the login screen (test-first) ⚠️ gate on parallel session

**Files:** `mobile/src/app/login.tsx`, `mobile/src/__tests__/login-screen.test.tsx`.

⚠️ This edits `src/app/**` — gate on the parallel session.

Add an iOS-only, availability-gated `AppleAuthenticationButton` below the existing "Sign in" `ZButton`. Pressing it runs a second `useAuthRequest`/`promptAsync` pinned to `provider: 'apple'`, then the same `completeLogin` path. Also migrate the screen's hard-coded login literals to the new `login.*` i18n keys from B-7 (the file currently notes "No auth.login.* keys exist" — B-7 created them).

- [ ] **Add the failing test** to `mobile/src/__tests__/login-screen.test.tsx`. Extend the existing `expo-auth-session` mock and add an `expo-apple-authentication` mock + Platform pin. Append:
  ```tsx
  jest.mock('expo-apple-authentication', () => ({
    AppleAuthenticationButton: (props: { testID?: string }) => {
      const { Pressable } = require('react-native');
      return <Pressable testID={props.testID ?? 'apple-signin'} />;
    },
    AppleAuthenticationButtonType: { SIGN_IN: 0 },
    AppleAuthenticationButtonStyle: { BLACK: 0 },
    isAvailableAsync: jest.fn(async () => true),
  }));

  test('renders the Apple sign-in button when available on iOS', async () => {
    jest.spyOn(require('react-native').Platform, 'OS', 'get').mockReturnValue('ios');
    await render(<LoginScreen />);
    await waitFor(() => expect(screen.getByTestId('apple-signin')).toBeOnTheScreen());
  });

  test('hides the Apple sign-in button on Android', async () => {
    jest.spyOn(require('react-native').Platform, 'OS', 'get').mockReturnValue('android');
    await render(<LoginScreen />);
    await waitFor(() => expect(screen.queryByTestId('apple-signin')).toBeNull());
  });
  ```
- [ ] **Run, expect FAIL** (no apple button rendered):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/login-screen.test.tsx 2>&1 | tail -25"
  ```
  Expect: `Unable to find an element with testID: apple-signin`.
- [ ] **Implement** in `login.tsx`:
  - Imports: `import { Platform } from 'react-native';`, `import * as AppleAuthentication from 'expo-apple-authentication';`, `import { useEffect } from 'react';`, `import { isAppleSignInAvailable } from '../auth/apple';`.
  - A second auth request pinned to Apple, plus availability state:
    ```tsx
    const [appleAvailable, setAppleAvailable] = useState(false);
    useEffect(() => {
      if (Platform.OS !== 'ios') return;
      void isAppleSignInAvailable().then(setAppleAvailable);
    }, []);

    const [appleRequest, , applefPromptAsync] = useAuthRequest(
      {
        clientId: workosClientId(),
        redirectUri,
        responseType: ResponseType.Code,
        usePKCE: true,
        scopes: [],
        extraParams: { provider: 'apple' },
      },
      workosDiscovery,
    );

    async function signInWithApple() {
      if (!appleRequest) return;
      setBusy(true);
      setFailed(false);
      try {
        if (appleRequest.codeVerifier) await stashCodeVerifier(appleRequest.codeVerifier);
        const result = await applefPromptAsync();
        if (result.type !== 'success' || !result.params.code) {
          if (result.type !== 'cancel' && result.type !== 'dismiss') setFailed(true);
          return;
        }
        const ok = await completeLogin(result.params.code);
        if (!ok && authStore.getState().status !== 'signedIn') setFailed(true);
      } catch {
        setFailed(true);
      } finally {
        setBusy(false);
      }
    }
    ```
  - Migrate the literals to i18n: `t('login.heading')`, `t('login.description')`, `t('login.signIn')` (button label + `testID="login-submit"`), `t('login.failed')`.
  - Render the Apple button below the existing button (inside the same `mt-7`/button column), gated on iOS + availability:
    ```tsx
    {Platform.OS === 'ios' && appleAvailable ? (
      <View className="mt-3">
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={{ width: '100%', height: 44 }}
          testID="apple-signin"
          onPress={() => void signInWithApple()}
        />
      </View>
    ) : null}
    ```
- [ ] **Run, expect PASS:**
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && pnpm --dir mobile jest src/__tests__/login-screen.test.tsx 2>&1 | tail -25"
  ```
  Expect: all login-screen tests pass (the existing brand/spinner/error/cancel tests still green — they assert `Zeta`/`Video coaching` and `testID="login-submit"`, which are preserved; the failed-state assertion now reads `t('login.failed')` which equals the same English string).
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add mobile/src/app/login.tsx mobile/src/__tests__/login-screen.test.tsx && git commit -m 'feat(mobile): add Sign in with Apple button to login (iOS, HIG button)'"
  ```

### Task B-11 — Release config: EXPO_ACCESS_TOKEN secret + deploy wiring

**Files:** `.env.example`, `.github/workflows/deploy-prod.yml`, `.github/workflows/deploy-dev.yml`.

GCP application secrets in this repo are **created out-of-band in Secret Manager** (Terraform manages only the Cloud Run skeleton + scheduler + SQL + storage; secrets are referenced by id in the deploy workflows' `--set-secrets` flag — verified in `deploy-prod.yml:112`). `EXPO_ACCESS_TOKEN` follows the same convention.

- [ ] **Document the env var** in `.env.example` — change the commented block at the bottom to make the prod requirement explicit (keep it optional for local):
  ```bash
  # Expo Push Notifications
  # Required in deployed environments for authenticated push delivery to Expo's
  # enhanced-security tier. Stored in GCP Secret Manager (zeta-prod-expo-access-token,
  # zeta-dev-expo-access-token) and injected via the deploy workflows' --set-secrets.
  # Omit/leave blank locally to send without authentication (sandbox tokens).
  # EXPO_ACCESS_TOKEN=your_expo_access_token
  ```
- [ ] **Wire prod** — in `.github/workflows/deploy-prod.yml`, append to the `--set-secrets="..."` value (the long line ~112) the token (note the leading comma to extend the list):
  ```
  ,EXPO_ACCESS_TOKEN=zeta-prod-expo-access-token:latest
  ```
- [ ] **Wire dev** — in `.github/workflows/deploy-dev.yml`, find its `--set-secrets` flag and append:
  ```
  ,EXPO_ACCESS_TOKEN=zeta-dev-expo-access-token:latest
  ```
  (Read the dev workflow first to confirm the exact flag and secret-id prefix `zeta-dev-`.)
- [ ] **Validate the workflow YAML** parses (no schema break):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && python3 -c 'import yaml,sys; [yaml.safe_load(open(f)) for f in [\".github/workflows/deploy-prod.yml\",\".github/workflows/deploy-dev.yml\"]]; print(\"ok\")'"
  ```
  Expect: `ok`.
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add .env.example .github/workflows/deploy-prod.yml .github/workflows/deploy-dev.yml && git commit -m 'chore(release): wire EXPO_ACCESS_TOKEN secret into deploy workflows'"
  ```

### Task B-12 — Release config: production FCM/APNs in EAS + run-checklist record

**Files:** `.agents/reports/<ts>_wp8_release_checklist.md` (new). **No `mobile/app.json` or `mobile/eas.json` edit in this Task.**

> **Ownership boundary (collision avoidance):** the `expo-notifications` install + the `app.json` plugin entry + the new EAS dev build are **owned by the dedicated push plan** `20260613191948_mobile_plan_9_push_notifications.md` (its Task B1). WP8 does **not** re-install the package or re-add the plugin — doing so would duplicate that plan and risk a merge collision in `app.json`/the lockfile. WP8's release Task is **production credentials only**: the `EXPO_ACCESS_TOKEN` GCP secret follow-ups (the secret + deploy wiring land in B-11) and the FCM/APNs upload to EAS credentials. Sequence this after the push plan's B1 has landed the plugin.

Push credentials (Android FCM v1 service-account JSON, iOS APNs key) are uploaded to **EAS credentials**, not committed, and are referenced automatically by `eas build` — so `eas.json` needs no edit. This Task records the human-run release steps that cannot be automated from here.

- [ ] **Confirm the push plan landed the notifications plugin** (do not add it here):
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && grep -c 'expo-notifications' mobile/app.json"
  ```
  Expect: `>= 1`. If it is `0`, the push plan (`20260613191948` Task B1) has **not** landed yet — **stop and sequence it first**; WP8 must not add the plugin itself.
- [ ] **Write the human-run checklist** `.agents/reports/<ts>_wp8_release_checklist.md` (use a real timestamp `YYYYMMDDHHMMSS`). Content:
  ```markdown
  # WP8 Release Checklist (human-run, not automatable from CI)

  ## Context
  WP8 makes the app App-Store-submittable. Code lands on feat/mobile-token-auth (PR #15).
  These steps require dashboard/console access and cannot run from this repo.

  ## Sign in with Apple — WorkOS + Apple Developer
  - [ ] Apple Developer: enable the "Sign in with Apple" capability for App ID com.m4xon.zeta.
  - [ ] WorkOS dashboard: add the **Apple** OAuth provider to the AuthKit org (same org as Google).
  - [ ] WorkOS: confirm the mobile redirect URI (zeta://auth/callback and the Expo Go exp:// URI) is registered (App Store Guideline 4.8 / HIG).
  - [ ] Verify on a physical iOS device: Apple button appears, completes WorkOS PKCE, yields a Zeta session.

  ## EXPO_ACCESS_TOKEN secret (GCP)
  - [ ] Create the Expo access token (expo.dev account settings → Access Tokens).
  - [ ] gcloud secrets create zeta-prod-expo-access-token --data-file=- (paste token); same for zeta-dev-expo-access-token.
  - [ ] Grant the Cloud Run runtime SA secretAccessor on both (matches existing zeta-prod-* secrets).
  - [ ] Re-run deploy-dev / deploy-prod; confirm the container starts with EXPO_ACCESS_TOKEN bound.

  ## Production push credentials (EAS)
  - [ ] Android: upload the FCM v1 service-account JSON to EAS (eas credentials → Android → Google Service Account).
  - [ ] iOS: upload/generate the APNs key in EAS (eas credentials → iOS → Push Notifications).
  - [ ] Build with eas build --profile production for both platforms; confirm push token registration end-to-end on a device.

  ## Account-deletion data retention (follow-up — not blocking submission)
  DELETE /auth/me scrubs all rows that store the user's PII or are personal to them
  (user_preferences, user_devices, notifications) and anonymizes review authorship
  (video_reviews.author_id → NULL). The following are intentionally RETAINED because
  auto-deleting them would corrupt other members' shared data; they hold only opaque
  WorkOS ids once user_preferences is gone (see the B-2 deletion-completeness audit):
  - [ ] Build an admin/offboarding path to transfer or tear down GROUPS owned by the
        deleted user (groups.owner_id) so orphaned owner ids do not linger.
  - [ ] Decide media lifecycle for ASSETS/VIDEOS the user uploaded (assets.owner_id),
        incl. Mux asset deletion, as a data-retention policy item.
  - [ ] Decide counterparty-facing teardown for COACHING bookings/availability
        (expert_id/student_id) per the retention policy.

  ## App Store submission notes
  - [ ] Account deletion (DELETE /auth/me) is reachable from Profile → Danger Zone (Guideline 5.1.1(v)).
  - [ ] Account deletion removes the user's PII (preferences, devices, notifications) and de-identifies their comments; no half-deletion (see B-2 audit).
  - [ ] Attach emulator/device screenshots of: Profile delete dialog, Login Apple button.
  ```
- [ ] Commit:
  ```bash
  wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && git add .agents/reports/ && git commit -m 'chore(release): add WP8 release checklist (Apple provider, EXPO token, FCM/APNs)'"
  ```

---

## Verification (run after all Tasks)

- [ ] **Backend:** `wsl.exe -d ubuntu bash -lc "cd /home/heinrich/dev/projects/zeta && /usr/local/go/bin/go test ./internal/auth/... ./internal/db/..."` — all green; `make api:openapi:lint` 0 errors.
- [ ] **Contract idempotency:** re-run `pnpm --dir mobile run generate:api` → `git diff --exit-code mobile/src/api/schema.d.ts` shows no change.
- [ ] **Mobile gates:** `make mobile:lint`, `make mobile:typecheck`, `make mobile:test` (or the WSL-direct equivalents) — all green. Targeted: `pnpm --dir mobile jest src/api/queries/account.test.tsx src/auth/apple.test.ts src/auth/auth-store.test src/__tests__/profile-screen.test.tsx src/__tests__/login-screen.test.tsx`.
- [ ] **Emulator screenshots** in the PR #15 body (mandatory per `mobile/AGENTS.md`): Profile Danger-Zone + delete confirm dialog; Login screen with the Apple button (iOS simulator).
- [ ] **Adversarial review pass:** delete completeness (all four local scrubs run — prefs, devices, notifications, review anonymize — no orphaned PII), delete order (all local scrubs before the irreversible WorkOS delete), 204 semantics, no PII/token logging, retained tables hold only opaque ids (offboarding follow-ups recorded), Danger-Zone reuses `ZDangerZoneCard` (no hand-styled danger border), Apple button only on iOS-available, i18n keys present in all three locales, no mobile-only keys lost to the sync.

---

## SELF-REVIEW

**Spec coverage (every WP8 requirement → Task):**
- (a) Account deletion — backend net-new: grep-proven absence (B-1), WorkOS `DeleteUser` interface (B-1), full account-scrub queries (B-2: prefs + devices + notifications + review anonymize, per the deletion-completeness audit of every user-owned table), `DeleteMe` handler running all scrubs before the irreversible WorkOS delete + tests (B-3), route + `deleteMe` contract (B-4); mobile: hook (B-5), store action (B-6), shared `ZDangerZoneCard` UI (B-8). Apple Guideline **5.1.1(v)** cited in the handler doc-comment and the contract `description`. No half-deletion: retained tables hold only opaque ids (PII removed) and are logged as offboarding follow-ups in the B-12 checklist. ✓
- (b) Sign-in-with-Apple — `expo-apple-authentication` dep + availability module (B-9), iOS-only HIG button on login (B-10), WorkOS Apple provider in the run-checklist (B-12). Required-because-Google rationale + Guideline **4.8** + HIG cited in the UI-Parity table and B-9/B-10. No backend change (reuses `/auth/token` PKCE) — stated explicitly. ✓
- (c) Release follow-ups — `EXPO_ACCESS_TOKEN` GCP secret + deploy wiring (B-11), production FCM/APNs in EAS + human checklist (B-12). The `expo-notifications` install/plugin/EAS-build is **owned by the push plan `20260613191948` (Task B1)**, not duplicated here — B-12 only verifies it landed and records the prod credential steps. ✓

**Placeholder scan:** No "TBD"/"add validation"/"handle edge cases"/"similar to Task N". Every snippet is real Go/TS/YAML/JSON/SQL. Every referenced symbol is defined: `DeleteUser` (B-1), the four scrub queries `DeleteUserPreferences`/`DeleteUserDevices`/`DeleteUserNotifications`/`AnonymizeUserReviewAuthorship` (B-2), `DeleteMe` (B-3), `deleteMe` operation (B-4), `useDeleteAccountMutation` (B-5), `deleteAccount` store action (B-6), i18n keys (B-7), `isAppleSignInAvailable` (B-9). `ZDangerZoneCard` is the shared WP-UI0 primitive (consumed by B-8, defined in `20260613233000`). Tests reference only symbols created in the same or earlier Tasks (or in WP-UI0).

**Type/name consistency:**
- `usermanagement.DeleteUserOpts{User: string}` — verified against SDK v4.46.1 (`client.go:227`).
- `GetUser(ctx)` returns `*UserContext` with `.ID` (used by `Me`/`UpdateMe`); test seeds via `context.WithValue(ctx, UserKey, &UserContext{ID:...})` — matches the existing auth-handler test idiom.
- `NewHandler(logger, q, workos)` — 3-arg signature confirmed (`handler.go:192`).
- `AnonymizeUserReviewAuthorship` takes a `pgtype.Text` (nullable `author_id`, pgx mapping) — **not** `sql.NullString`; verified against `internal/db/video_reviews.sql.go` (`AuthorID pgtype.Text`) and the `pgtype.Text{String:…, Valid:true}` construction in `internal/reviews/handler.go:276`. The handler/test add the `github.com/jackc/pgx/v5/pgtype` import.
- Mobile hook follows the `Pick<typeof api, 'DELETE'>` injectable pattern and 204-no-body `error === undefined` check from `useLeaveGroupMutation`. The hook calls `DELETE('/auth/me')` with a single arg, so the test asserts `toHaveBeenCalledWith('/auth/me')` (no trailing `undefined`).
- `ZDangerZoneCard` (WP-UI0) props (`title/description/actionLabel/onAction/loading/disabled?/confirmTitle/confirmMessage/confirmLabel/testID?`) — B-8 passes exactly these; the danger `ZButton` + `ZConfirmDialog(tone='danger')` are internal to the card, so the screen reuses it without re-declaring dialog state or a one-off danger border.
- i18n keys live under `preferences.*` (existing namespace) + a new `login.*` namespace, added to the **web** source first then synced (drift caveat handled).

**Reuse-or-justify:** No new `mobile/src/components/` domain component. The Danger-Zone card reuses the shared **`ZDangerZoneCard`** (WP-UI0) — the same destructive-action card as group-delete — so account-delete is visually identical and no hand-styled danger border / one-off `z-danger/30` token survives. The only non-z-\* control is Apple's mandated `AppleAuthenticationButton` — a documented HIG/Guideline-4.8 exception, login-only, not SHARED. No new shared z-\* primitive is introduced by this plan (so no extra primitive test required here; `ZDangerZoneCard`'s test lives in WP-UI0).
