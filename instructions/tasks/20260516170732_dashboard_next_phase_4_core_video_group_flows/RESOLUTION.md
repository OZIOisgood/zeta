# Resolution

## Summary

Implemented the first Phase 4 migration slice for `web/dashboard-next`. The new dashboard shell now renders routed page content, and the app includes mobile-first Home, Videos, Video details, Upload video, Groups, Group details, Create group, and Group preferences routes.

Follow-up in the same Phase 4 task completed the missing video-review detail flow: Mux playback, video part switching, timestamped comments, comment mutation actions, and final review action wiring.

## Technical Details

- Replaced the root shell's hard-coded home content with a route-driven layout using `router-outlet`.
- Added feature routes for the core video and group flows while keeping the old `web/dashboard` app available as the behavioural reference.
- Extended the app shell store so nested feature routes keep the correct main navigation section selected.
- Extended the NgRx Signal Stores for videos and groups with detail loading, active entity, and group mutation state.
- Added mobile-first page components for video lists, video details, upload steps, group lists, group details, group creation, and group preferences.
- Added `@mux/mux-player` to `dashboard-next` and load it lazily from the video details route so playback does not bloat the initial application bundle.
- Extended the video details page with selected video-part state, Mux playback for the current part, timestamp capture, review list loading, comment creation/edit/delete, and final review controls.
- Extended the Videos NgRx Signal Store with review loading/mutations and finalization methods backed by the existing asset/review API client.
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
- The follow-up `make web-next:build` passed with the current initial bundle warning: 549.39 kB versus the 500 kB warning budget. Mux is split into a lazy player chunk.
- `make web:build` passed with the legacy dashboard's existing budget, CommonJS `agora-rtc-sdk-ng`, and stale `baseline-browser-mapping` warnings.
- Generated build outputs were removed after verification.

## Tests

Added and updated focused tests:

- Updated the app shell test for route-driven rendering.
- Added app shell store coverage for nested route section selection.
- Added component tests for the Videos and Groups pages with mocked API clients and Transloco testing configuration.
- Added Videos Store coverage for loading and creating reviews.
- Added Video Details component coverage for Mux markup, video-part switching surface, and timestamped comments.
- The latest follow-up test run passed: 11 test files and 21 tests.

## Backend/API Notes

No backend code changes were required in this phase.

The following areas remain intentionally deferred for later Phase 4 slices:

- Upload transport and submission finalisation were wired after the original slice; keep regression-testing this flow as the upload UI is refined.
- Group invitations, QR/link handling, and member management are represented as detail-page placeholders and should be wired to the existing or adjusted backend endpoints in a later slice.
- Permission-aware route and action gating still needs a fuller pass. The video detail actions now use the session permissions, but route-level and group action gating remain incomplete.

## Next Steps

- Continue Phase 4 with group invitation, QR/link, user-list, and member-management flows from the old dashboard reference.
- Add focused tests for upload step behaviour and group preference tabs when those surfaces become interactive beyond the current form shell.
- Revisit Storybook bundle size only if Storybook deployment is later promoted from optional/local-only to a deployed artifact.
