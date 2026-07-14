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

### Name-pending placeholder (UX follow-through)

The un-onboarded member would otherwise render as the hardcoded English `"User"` in an
otherwise-localized UI. Instead of string-matching that fallback in the client, the API now emits
an explicit `name_pending` boolean (true when a member has no alias and no first/last name).
`display_name` is unchanged as a graceful fallback for any non-flag-aware consumer. The dashboard
reads the flag and renders a localized placeholder ("Noch ohne Namen" / "No name yet" / "Sans nom
pour le moment") in muted italic, with a neutral `?` avatar initial. On `main` the web dashboard
is the only consumer of this endpoint (mobile is not yet merged).

## Files touched

- `internal/users/handler.go` — remove per-member `RequireDisplayName` gate; guard expert/admin
  full-name fallback; add `name_pending` to the member payload.
- `internal/preferences/profile.go` — add `IsNamePending` (no alias and no first/last name).
- `internal/preferences/profile_test.go` — table test for `IsNamePending`.
- `internal/users/handler_test.go` — `TestListGroupUsersMemberWithBlankNameDegradesInsteadOf500`
  (reproduces the exact prod error; asserts 200 + `display_name == "User"` + `name_pending`);
  named-member assertion that the flag is absent.
- `web/dashboard-next/src/app/core/http/groups-api.service.ts` — `name_pending?: boolean` on
  `GroupMember`.
- `web/dashboard-next/src/app/pages/group-details/group-details-page.component.ts` — localized
  placeholder + muted style, `?` avatar initial, `memberLabel` used for alt/remove-dialog/toast.
- `web/dashboard-next/src/app/pages/group-details/group-details-page.component.spec.ts` — render
  test for the placeholder.
- `web/dashboard-next/public/i18n/{en,de,fr}.json` — `groups.users.namePending`.

## Verification

- Backend test RED first (status 500, `err="user display name is missing"`), GREEN after fix;
  `name_pending` assertion RED then GREEN.
- Frontend placeholder spec RED (rendered `UUser`) then GREEN.
- `go test ./internal/users/ ./internal/preferences/` — pass; existing ErrNoRows→500 test green.
- `go build ./...`, `go vet`, `gofmt -l` — clean.
- Dashboard: `ng build` ok, `ng test` 148/148 pass, `prettier --check` clean.

## Follow-ups

- Data: the affected dev student in group `c94b9684…` still has no display name — set one if a
  proper name is wanted (list now works regardless).
- Consider whether `GetUserPreferences`/`pgx.ErrNoRows` should also degrade rather than 500 the
  whole list; left as-is here because an existing test encodes 500 as intended behavior.
