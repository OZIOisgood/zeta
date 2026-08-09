# CompleteUpload Authorization Fix

## Context

`POST /assets/{id}/complete` (`CompleteUpload` in `internal/assets/handler.go`) performed no
ownership or visibility check: any authenticated user could flip any asset's status to
`pending` by guessing or leaking its UUID. `GetAsset` and `FinalizeAsset` in the same file
already gate access through `GetVisibleAsset`.

## Decision

Follow the existing `FinalizeAsset` pattern: resolve the caller via `auth.GetUser` (401 when
missing), load the asset through `h.q.GetVisibleAsset` with UserID/IsStudent (404 when not
visible), and additionally require `asset.OwnerID == userInfo.ID` (403 otherwise) — only the
uploader may mark their own upload as complete. No new sqlc query was needed.

## Files Touched

- `internal/assets/handler.go` — auth/visibility/ownership checks in `CompleteUpload`, with
  `asset_complete_upload_visibility_denied` / `asset_complete_upload_not_owner` warn logs.
- `internal/assets/handler_test.go` — tests for owner success (200), non-owner (403),
  not-visible (404), unauthenticated (401).

## Verification

- New tests written first and observed failing against the vulnerable handler (TDD).
- `make test:unit` green; `make api:build` compiles.

## Follow-ups

- None. `docs/openapi.yaml` intentionally untouched (exists only on the mobile branch).
