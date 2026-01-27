# Task: Implement User Preferences and Avatar Selector

## Status

- [ ] Defined
- [ ] In Progress
- [x] Completed

## Description

Implement a "User Preferences" dialog accessible from the top bar (avatar click), allowing users to update their profile information:

- First Name
- Last Name
- Language (selection)
- Avatar (upload with client-side compression)

Additionally, refactor the existing Avatar Selection logic from the `CreateGroupPage` into a reusable shared component (`AvatarSelectorComponent`) to ensure consistency and reduce code duplication.

## Context

- `web/dashboard/src/app/shared/components/preferences-dialog/`
- `web/dashboard/src/app/shared/components/avatar-selector/`
- `web/dashboard/src/app/pages/create-group-page/`
- `internal/api/server.go` (UpdateMe endpoint)

## Acceptance Criteria

- [x] User can open preferences dialog from the top-right avatar menu.
- [x] User can update First Name, Last Name, and Language.
- [x] User can upload an avatar (max 300KB, compressed client-side).
- [x] The `AvatarSelectorComponent` is created and used in both Preferences and Create Group pages.
- [x] The UI for Create Group page remains consistent with previous design.
