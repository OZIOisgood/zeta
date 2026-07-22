# Video student identity

## Context

Ticket #16 reported that video details showed the group but not the student who uploaded or owns the video.

## Decision

- Extend the authorized asset-detail query with the owner's local profile.
- Return a privacy-safe `student` object using display name, first-name/last-initial fallback, and avatar; preserve the existing visibility predicate and `owner_id` field.
- Show stacked, labeled Student and Group identity rows in the narrow sidebar/mobile card. Keep Group linked and Student unlinked because no student profile route exists.

## Files touched

- `db/queries/assets.sql`
- `internal/db/assets.sql.go`
- `internal/assets/handler.go`
- `internal/assets/handler_test.go`
- `web/dashboard-next/src/app/core/http/assets-api.service.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.ts`
- `web/dashboard-next/src/app/pages/video-details/video-details-page.component.spec.ts`

## Verification

- `make db:sqlc`: passed.
- Focused assets package and video-details tests: passed.
- `make test:unit`: passed.
- Full frontend suite: 45 files, 154 tests passed.
- Frontend formatting check: passed.
- API build: passed.
- Dashboard production build: passed with existing bundle-size and CommonJS warnings.

## Follow-ups

None.
