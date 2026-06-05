## Context

User display profile fields should use `user_preferences` as the source of truth. WorkOS should seed preferences only for a brand-new signup, then receive one-way profile updates from Zeta so admins can search users in WorkOS.

The observed dev issue is that a user whose local preferences were changed to `First name` / `Last name` still appears as `Pavlo Lobariev` in the dashboard.

## Findings

- `/auth/me` loads `user_preferences`, but returns `first_name` and `last_name` from the authenticated JWT/WorkOS user instead of `prefs.FirstName` and `prefs.LastName` (`internal/auth/handler.go`). The preferences page and shell display those `/auth/me` fields, so they can show WorkOS names after reload.
- The auth callback background job updates `user_preferences.first_name/last_name` from WorkOS on non-first login. This reverses the intended sync direction and can overwrite local preferences.
- The auth callback can also create a partial preferences row via `UpsertUserAvatar` before the foreground `/auth/me` first-login seed runs, which can skip negotiated language/timezone seeding.
- Group member/expert APIs use WorkOS for names and local preferences only for avatars (`internal/users/handler.go`). The Angular group UI renders those API names directly.
- Coaching participant/expert APIs use WorkOS names and preference avatars (`internal/coaching/users.go`). Booking/expert screens render those API names directly.
- Reviews/comments are mostly aligned: review list joins `user_preferences`, create reads author preferences, and missing author preferences is treated as an error. Remaining UI staleness can happen because `VideosStore.reviews` is kept in memory after profile changes.
- Several "update" queries can silently create incomplete preference rows outside first signup: `UpsertUserPreferences`, `UpdateUserEmailPreferences`, `UpsertUserAvatar`, and `UpsertUserTimezone`.
- Notification copy still uses auth/WorkOS names in places such as asset upload, invitation acceptance, and coaching booking emails. WorkOS email lookup remains reasonable for delivery email unless email is moved into local storage.

## Suggested Fix Direction

1. Split preference creation from updates. Keep a single first-signup seed path that writes language, timezone, first name, last name, and avatar when available.
2. Change `/auth/me` to return display profile fields from `user_preferences`; treat missing preferences after first signup as a backend invariant error.
3. Remove WorkOS -> `user_preferences` name writes from auth callback. Keep profile save as `user_preferences` update first, then async Zeta -> WorkOS sync.
4. Change group and coaching user resolvers to use `user_preferences` for first name, last name, and avatar. Continue using WorkOS for email and org role where needed.
5. Make update queries `UPDATE ... WHERE user_id = $1` and handle zero rows as an error outside first signup.
6. Optionally include author IDs or invalidate active reviews after profile save so open comment lists refresh author display data.
7. Update tests that currently allow missing preferences or only assert preference avatars.

## Verification

Read-only investigation. No builds or tests were run.
