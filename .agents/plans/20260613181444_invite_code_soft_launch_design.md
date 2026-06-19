# Invite-Code-Gated Soft Launch (Clubhouse Model) — Design

- **Date:** 2026-06-13
- **Status:** Design approved, pending implementation plan
- **Author:** Heinrich Mergel (with Claude)
- **Branch:** `feat/invite-code-soft-launch`

## Context

We want a controlled soft launch: limit who can actually *use* Zeta during pre-release,
without creating "account graveyards" of half-registered users and without fighting the
hosted WorkOS AuthKit UI (which cannot host a custom invite-code field).

An earlier approach gated **registration itself** — disable WorkOS public sign-up, validate
a code on an open route, then call `SendInvitation` to create a per-email exception. That
runs into the AuthKit chicken-and-egg problem and adds public webhook/invitation-mapping
infrastructure.

**Pivot:** adopt the Clubhouse model — **gate on access, not on registration.** Registration
stays free; the invite code is entered on *our own* post-login screen. This dissolves the
WorkOS-UI problem entirely (our screen → our API).

## Research basis (Clubhouse, verified)

Verified via a parallel research workflow (13 agents, 32 findings, 8 adversarially verified):

- Free, open registration; a reserved-but-**inactive** waitlist state; activation via either a
  scarce invite **or** a free contact-based "let them in"; activation flipped the account to
  **immediate full membership** plus its own invite allotment. Invite-gating was retired
  2021-07-21 when Clubhouse exited beta.
- Principles we adopt:
  - **Gate on access, not registration** — decouples funnel growth from capacity control.
  - **Scarcity via a fixed expert allotment** — access becomes a status object.
  - **Trusted fast-track via existing relationships** — but based on Zeta's explicit
    coach↔group relationships, **not** phone-contact scraping (Clubhouse's privacy trap:
    shadow profiles from non-consensual address-book upload).

## Existing constraints (verified in code)

- **No local `users` table.** Identity lives in WorkOS; local data is keyed by the WorkOS
  `user_id` (`TEXT`). Today only `user_preferences` is stored locally
  (`db/migrations/20260127175500_create_users.up.sql`).
- **Default role is `student`.** On the first `/auth/me`, `ensureUserInOrg`
  (`internal/auth/handler.go:531`) adds a new user to the default org as `student` and refreshes
  the session so the JWT carries the role.
- **Live token refresh already exists.** `refreshSessionForDefaultOrg`
  (`internal/auth/handler.go:597`) re-issues cookies after an org/role change — so a
  `student → expert` upgrade can take effect **without a manual re-login**.
- **Group invitations are already code-based.** `internal/invitations/handler.go` —
  `GetGroupInvitationByCode`, `AcceptInvitation`, multi-use link/QR codes. Role→permission lives
  in WorkOS and is baked into the JWT via `/auth/me`.

## Decisions

| Topic | Decision |
| --- | --- |
| Gate | On **access**, not registration. WorkOS public sign-up stays **ON**. |
| Waitlist UX | **Hard lock-out.** A `waitlisted` user sees only the code-entry screen + logout. |
| Activation moment | Atomic, at **code redemption** on our own post-login screen. |
| Expert codes | **5 per expert**, **bearer, single-use**. Redeem ⇒ upgrade to `expert` + `active`. |
| Admin codes | **Unlimited.** Admins can mint expert codes on demand. |
| Student path | Reuse **existing group-invite codes** ⇒ `active` + group join, role stays `student`, unlimited. |
| "Let them in" | None. The unlimited group-invite path is the trusted student fast-track. No contact scraping. |
| Platforms | **Web and mobile**, both in the soft launch. Mobile redeem screen folds into ongoing app dev (PR #15). |
| Role-change friction | Solved via existing `refreshSessionForDefaultOrg` (no manual re-login). |
| Grandfathering | Existing users (those with a `user_preferences` row at migration time) are backfilled to `active`. |

## Architecture

### Core flow

1. User registers freely via AuthKit → WorkOS account.
2. First `/auth/me` → `ensureUserInOrg` provisions role `student`. **New:** an access row is
   created/ensured with `status = waitlisted`.
3. Client routing guard: `waitlisted` → hard redirect to the code-entry screen (`/welcome` on
   web; the mobile equivalent). No other app access.
4. User submits a code → `POST /access/redeem`. One atomic transaction:
   validate code → set `access_status = active` → assign role / join group → consume code.
5. **Expert code:** upgrade `student → expert` (change WorkOS org-membership role) + live token
   refresh via `refreshSessionForDefaultOrg` → route into the app.
6. **Group-invite code:** stay `student`, join the group via existing `AcceptInvitation` logic,
   flip to `active`.

### Data model (two new tables)

There is no local `users` table, so access state gets its own table keyed by the WorkOS id.

**`user_access`**
- `user_id TEXT PRIMARY KEY` — WorkOS user id
- `status TEXT NOT NULL DEFAULT 'waitlisted'` — `waitlisted` | `active`
- `activated_at TIMESTAMP NULL`
- `activated_via TEXT NULL` — audit: which code/mechanism activated the user
- `created_at TIMESTAMP NOT NULL DEFAULT now()`
- Missing row is treated as `waitlisted` (defensive default).

**`signup_codes`** (expert invite codes)
- `id UUID PRIMARY KEY`
- `code TEXT UNIQUE NOT NULL` — bearer string, generated with the existing code alphabet
- `owner_user_id TEXT NOT NULL` — the expert (or admin) who owns/minted the code
- `status TEXT NOT NULL DEFAULT 'available'` — `available` | `consumed`
- `redeemed_by_user_id TEXT NULL`
- `consumed_at TIMESTAMP NULL`
- `created_at TIMESTAMP NOT NULL DEFAULT now()`
- No `workos_invitation_id` / email mapping needed — redemption happens post-login by an
  already-authenticated user.

### Backend (`internal/access`, new package)

- `POST /access/redeem {code}` — authenticated, intended for `waitlisted` users. Resolves the
  code class:
  - matching available `signup_codes` row → upgrade role to `expert`, flip access `active`,
    mark code `consumed` (set `redeemed_by_user_id`/`consumed_at`), refresh session.
  - else matching valid group invitation (`GetGroupInvitationByCode`) → run existing group-join
    logic, flip access `active` (role stays `student`).
  - else → neutral error (no enumeration oracle).
  - Guard against double-spend / races (single-flight on the code row; reject already-`consumed`).
  - Rate-limited via the existing limiter infra (`internal/auth/ratelimit.go`).
- `GET /access/codes` — expert-only. Lists the caller's codes + status; **lazily generates the
  5-code allotment** on first call.
- `POST /access/codes` — **admin-only, unlimited.** Mints additional expert codes. Gated by
  `RoleAdmin` (deliberately role-based, not a new WorkOS permission — a new permission would need
  a WorkOS grant + re-login, which we avoid for the soft launch).
- `/auth/me` enrichment: include `access_status` in the response body so clients can gate routing
  without a JWT change (access state lives in our DB; `/auth/me` already enriches its response).
- `auth.UserManagement` interface: add a method to **change** an org-membership role
  (`student → expert`) and regenerate mocks (`internal/auth/mocks/mock_workos.go`).
- Structured `slog` logging: stable snake_case events, `component`, `err` field. Never log codes
  in clear text or email addresses.

### Frontend — Web (`web/dashboard-next`)

- Routing guard reads `access_status` from `/auth/me`; `waitlisted` → redirect to `/welcome`.
- `/welcome` (Clubhouse-style code screen): title, code input, submit, error/loading states,
  logout. `z-*` primitives, Transloco, skeleton loading. On success → refetch `/auth/me` → route
  into the app.
- Expert codes page (role-gated): the 5 codes with status (free / consumed) + copy button.
  Admin variant additionally shows a "generate codes" action.

### Frontend — Mobile (`mobile/`)

- Same backend gate. The waitlist guard + redeem screen mirror the web flow, built with `z-*`
  primitives, the typed openapi-fetch client (regenerate from `docs/openapi.yaml`), and i18next
  (synced from Transloco). Folds into ongoing app development (PR #15).

### Rollout / migration

- New migrations for `user_access` and `signup_codes` (+ down).
- **Grandfathering backfill:** insert `user_access(status='active')` for every `user_id` that
  already has a `user_preferences` row at migration time. Only genuinely new users start
  `waitlisted`.
- WorkOS: public sign-up stays **ON** (no dashboard change). The earlier "disable public sign-up"
  step is removed.
- **Bootstrap:** the first experts are created/upgraded manually in the WorkOS dashboard.
- Update `.env.example` / docs / Terraform only if new config is actually introduced (none
  expected for this design).
- Update README diagrams if the user journey / tables change.

### Tests

- Handler tests with mocked `UserManagement`:
  - expert-code redeem (role upgrade + session refresh)
  - group-code redeem (student + group join, access flip)
  - invalid code (neutral error)
  - already-`active` user
  - double-redemption of a consumed code
  - `waitlisted` gate enforcement on a protected route
  - admin unlimited generation vs expert fixed allotment of 5
- Migration backfill correctness (existing users → `active`, new → `waitlisted`).

## Out of scope / follow-ups

- Code expiry / waitlist TTL — codes and waitlist entries do not expire in v1.
- Email-to-code binding — codes are bearer in v1 (low resale risk in a trusted coach circle).
- Invite replenishment by activity (Clubhouse earned invites) — fixed allotment in v1; admins
  cover edge cases by minting more.
- Secondary-market / abuse hardening beyond double-spend protection.
