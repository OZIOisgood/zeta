# Video part status localization completion

## Context

Ticket #22 showed raw backend values such as `waiting_upload` in the video-parts list.

## Decision

- The page translates non-ready video-part statuses through `videos.phase4.status`; ready parts intentionally have no status label.
- The frontend status type mirrors the three backend enum values: `waiting_upload`, `ready`, and `failed`.
- English, German, and French labels were added for all three values.

## Files touched

- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.spec.ts`
- `web/dashboard-next/src/app/core/http/assets-api.service.ts`
- `web/dashboard-next/public/i18n/{en,de,fr}.json`
- `.agents/plans/20260722150032_video_part_status_localization.md`

## Verification

- Focused video-details Angular test passed.
- Prettier check passed and all edited locale JSON files parsed successfully.
- Production Angular build passed.
- `make web-next:lint` could not be invoked directly because the terminal's project-local Node is 16.14.2 while pnpm requires Node 18.12+; checks used the bundled Node 24 runtime and existing dependencies without permitting pnpm to purge/reinstall `node_modules`.

## Follow-ups

- None.
