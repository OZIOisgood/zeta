## Context

Ticket #7 asks for display names so students do not see other users' email
addresses or full names. Experts still need real student names in reports and
may see them in the group details student list.

## Plan

- Add a backend display-name helper that formats public names as `First L.` with
  a neutral fallback.
- Change group member list responses to omit email addresses and expose
  `display_name`; include `full_name` only for the student-list endpoint, which
  is permission-gated for experts/admins.
- Update the dashboard group member types and group details layout to render the
  display name first and the optional real name beneath it.
- Add focused backend and frontend tests that assert emails are not exposed or
  rendered.

## Verification

- Run focused Go tests for `internal/users`.
- Run focused dashboard tests for the group details page if available, then
  broader frontend checks as time permits.
