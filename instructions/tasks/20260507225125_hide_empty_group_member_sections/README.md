# Task: hide empty group member sections

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user viewing a group details page, I want empty Students and Experts member sections to be hidden, so that the page does not show empty list copy for member categories that have no entries.

The member section headings should be direct section headings. Experts should appear before Students, and the Students heading should own the group invitation action. When students are empty but invitations are available, the Students section should remain visible with an illustrated message and invitation CTA.

## Permissions

This is a dashboard presentation change. It reuses the existing group member list permissions and does not add or change permissions.

## Context
- `web/dashboard/src/app/pages/group-details-page/group-details-page.component.html`
- `web/dashboard/src/app/pages/group-details-page/group-details-page.component.ts`
- `web/dashboard/src/app/shared/components/users-list/users-list.component.ts`
- `web/dashboard/src/app/shared/components/users-list/users-list.component.html`

## Test Assessment

The change is limited to dashboard presentation state and list visibility. No new business rules or data transformations are introduced, so automated unit tests are not required. The dashboard build is required to verify template and TypeScript validity.

## Loading State Assessment

This change touches asynchronous member-list loading behavior. Existing Taiga UI skeleton placeholders must remain visible while each permitted list is loading. Once a list has loaded with no entries, its section should be hidden instead of showing an empty-state message.

## Acceptance Criteria
- [x] The Students section remains visible after the students list loads empty when invitations are available.
- [x] The Experts section is hidden after the experts list loads empty.
- [x] Experts appears before Students.
- [x] Experts and Students use `h2` headings.
- [x] The generic Members heading is removed.
- [x] The Invite action appears to the right of the Students heading.
- [x] Empty Students state shows an illustrated message with an invitation button.
- [x] Non-empty member lists remain visible.
- [x] Existing member-list skeleton loading placeholders remain in use while data is pending.
- [x] The dashboard build passes.
