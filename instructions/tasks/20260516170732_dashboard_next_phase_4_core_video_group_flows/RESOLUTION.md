# Resolution

## Summary

Implemented the first Phase 4 migration slice for `web/dashboard-next`. The new dashboard shell now renders routed page content, and the app includes mobile-first Home, Videos, Video details, Upload video, Groups, Group details, Create group, and Group preferences routes.

## Technical Details

- Replaced the root shell's hard-coded home content with a route-driven layout using `router-outlet`.
- Added feature routes for the core video and group flows while keeping the old `web/dashboard` app available as the behavioural reference.
- Extended the app shell store so nested feature routes keep the correct main navigation section selected.
- Extended the NgRx Signal Stores for videos and groups with detail loading, active entity, and group mutation state.
- Added mobile-first page components for video lists, video details, upload steps, group lists, group details, group creation, and group preferences.
- Preserved backend/API terminology in code by keeping `asset` for reviewable parent submissions while rendering user-facing copy as **video**.
- Used skeleton placeholders for async content loading states and avoided visible loading text for page content placeholders.
- Added new Transloco keys in English, German, and French for the Phase 4 page slice.
- Added Storybook coverage for core video and group list states.

## Verification

- [x] Ran `make web-next:build`.
- [x] Ran `make web-next:test`.
- [x] Ran `make web-next:storybook:build`.
- [x] Ran `make web:build`.

Notes:

- `make web-next:storybook:build` passed with Storybook's existing generated chunk size warnings.
- `make web:build` passed with the legacy dashboard's existing budget, CommonJS `agora-rtc-sdk-ng`, and stale `baseline-browser-mapping` warnings.
- Generated build outputs were removed after verification.

## Tests

Added and updated focused tests:

- Updated the app shell test for route-driven rendering.
- Added app shell store coverage for nested route section selection.
- Added component tests for the Videos and Groups pages with mocked API clients and Transloco testing configuration.
- The final test run passed: 9 test files and 18 tests.

## Backend/API Notes

No backend code changes were required in this phase.

The following areas remain intentionally deferred for later Phase 4 slices:

- Upload transport and submission finalisation are not wired in the new upload page yet.
- Video review comments, comment posting, and final review actions still need dedicated page/store work.
- Group invitations, QR/link handling, and member management are represented as detail-page placeholders and should be wired to the existing or adjusted backend endpoints in a later slice.
- Permission-aware route and action gating should be added once the related session/permission store behaviour is finalised.

## Next Steps

- Continue Phase 4 with deeper upload transport, video review, invitation, QR/link, and member-management flows.
- Add focused tests for upload step behaviour and group preference tabs when those surfaces become interactive beyond the current form shell.
- Revisit Storybook bundle size only if Storybook deployment is later promoted from optional/local-only to a deployed artifact.
