# Fix: group users list 500 on member with missing display name

## Context

`GET /groups/{groupID}/users` returned **500** on dev (`app.dev.strido.net`, group
`c94b9684-1e42-471c-91f4-44c42ed109d0`). The experts list on the same screen loaded fine.

Cloud Run logs (`zeta-api-dev`, project `zeta-491012`) confirmed the cause:

```
component=users  message=users_resolve_group_member_failed  err="user display name is missing"
```

## Root cause

`listGroupMembers` resolves each member in parallel and treated **any** per-member error as
fatal — a single `preferences.RequireDisplayName` failure (`ErrDisplayNameMissing`) aborted the
whole list with 500. A student member had a preferences row but no first/last name and no
display-name alias (never completed onboarding), so the entire student list failed. The experts
list worked because its one member had a name.

## Decision

Drop the hard `RequireDisplayName` gate inside the group-member list only. `PublicDisplayName`
already degrades gracefully to a non-PII fallback (alias → `First L.` → first name → `"User"`),
so an un-onboarded member now renders degraded instead of 500-ing the list. Expert/admin display
falls back to `PublicDisplayName` when the full name is empty. Genuine `GetUserPreferences`
errors (incl. `pgx.ErrNoRows` for a missing row) still return 500 — that invariant is unchanged
and its existing test is preserved. `RequireDisplayName` stays in force where a name is truly
required (coaching emails, assets, invitations).

## Files touched

- `internal/users/handler.go` — remove per-member `RequireDisplayName` gate; guard expert/admin
  full-name fallback.
- `internal/users/handler_test.go` — add `TestListGroupUsersMemberWithBlankNameDegradesInsteadOf500`
  (reproduces the exact prod error; asserts 200 + `display_name == "User"`).

## Verification

- New test RED first (status 500, `err="user display name is missing"`), GREEN after fix.
- `go test ./internal/users/ ./internal/preferences/` — pass; existing ErrNoRows→500 test still green.
- `go build ./...`, `go vet ./internal/users/`, `gofmt -l` — clean.

## Follow-ups

- Data: the affected dev student in group `c94b9684…` still has no display name — set one if a
  proper name is wanted (list now works regardless).
- Consider whether `GetUserPreferences`/`pgx.ErrNoRows` should also degrade rather than 500 the
  whole list; left as-is here because an existing test encodes 500 as intended behavior.
