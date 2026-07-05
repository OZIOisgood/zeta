## Context

Follow-up on ticket #7: students should have privacy-facing display names, but
experts are professional identities and should be shown by real name to students
and other experts. Students also need a separate setting to edit display name.

## Plan

- Add `user_preferences.display_name`, seeded and backfilled from `First L.`.
- Use `display_name` for student member list labels, with expert/admin callers
  also receiving `full_name` for students.
- Use real full names for expert/admin member list labels for every caller; keep
  emails out of all member-list responses.
- Add a student-only display name input in dashboard Preferences.
- Update tests and README visibility docs.

## Verification

- Run SQL generation after migration/query changes.
- Run focused backend and dashboard tests, then build/lint/unit checks.
