# Resolution

## Summary

Implemented users list on the groups page.

## Technical Details

### Backend

- Created `internal/users` package.
- Implemented `ListUsers` handler using `workos-go` SDK to fetch users from WorkOS.
- Registered `GET /users` endpoint in `internal/api/server.go` (protected).
- Removed unused imports and initialized `usersHandler` correctly.

### Frontend

- Created `UsersService` to fetch user list from `/users`.
- Created `UsersListComponent` using `TuiTable`.
- Updated `GroupsPageComponent` to display the users list below the groups list.
- Configured imports for `TuiTable`, `TuiTableControlDirective`, `TuiCheckboxTableDirective`, and `TuiCheckboxRowDirective` ensuring proper table selection behavior.
- Updated users list UI to include a Role selector (`TuiSelect` inside `TuiTextfield`) and refined layout.
- Fixed runtime errors (`NG01203`, `NG0201`, `NG0309`) by correctly importing specific Textfield components and removing duplicate directives (`tuiTextfield` attribute) from the role select input.

## Verification

- [x] `make api:build` passed.
- [x] `make web:build` passed.
