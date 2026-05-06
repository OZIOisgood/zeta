# Resolution

## Summary
- Added expert review-status grouping on the Videos page.
- Preserved the existing single Videos list for users without `assets:finalize`.
- Added asset-level review counts to the asset-list API response so the dashboard can distinguish videos that have not been started from videos already in review.

## Technical Details
- Reused the existing `assets:finalize` permission as the expert review workflow gate.
- Updated `ListVisibleAssets` to include `review_count` across all video parts belonging to the parent asset.
- Added a pure dashboard utility that groups pending videos with zero reviews into **To review**, pending videos with reviews into **In review**, and completed videos into **Reviewed**.
- Extended `AssetListComponent` with configurable empty-state heading and description inputs while keeping existing defaults for current usages.
- Updated the root `README.md` dashboard feature description.

## Verification
- [x] Ran `go test ./internal/assets -count=1`.
- [x] Ran `cd web/dashboard && pnpm exec vitest run src/app/pages/videos-page/videos-page.component.spec.ts`.
- [x] Ran `make api:build`.
- [x] Ran `make web:build`.
- [x] Ran `make test:unit`.

## Tests
- Added `videos-page.component.spec.ts` coverage for review-status grouping.
- Updated `internal/assets/handler_test.go` to verify `review_count` is returned by the list endpoint.

## Next Steps
- None.
