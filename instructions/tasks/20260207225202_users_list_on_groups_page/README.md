# Task: Users list on group details page

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

As a user, I want to have a table with a users list of a group on the group details page.

The list should include:

- A "Role" column displayed as a Select dropdown with options "Admin", "Expert", "Student".
- A "User" column showing the user's avatar (or initials) and name/email.
- An "Actions" column with a dropdown menu (initially containing a disabled "Delete" action).

## Context

- The implementation should reference the provided `TuiTable` example.
- The users list should only be visible to users with the `groups:user-list:read` permission.
- Only "expert" and "admin" roles should have this permission.
- The list should **only** show users who are members of the specific group.

## Acceptance Criteria

- [x] A `groups:user-list:read` permission is created and assigned to `admin` and `expert`.
- [x] Users list is fetched from the backend, filtering by group ID.
- [x] The users list is displayed on the **Group Details** page.
- [x] The table follows the specified design (Role is a Select, Layout Refined).
- [x] The table is hidden for users without the required permission.
