# Resolution

## Summary
- Added project-local Air tooling for the Go API.
- Added `make api:dev` as a live-reload development command.
- Documented the live-reload command in the root README.

## Technical Details
- Added `.air.toml` to build `./cmd/api` into `tmp/air/api` and restart it when Go/template sources change.
- Added `github.com/air-verse/air` as a Go tool entry so contributors can run the pinned tool with `go tool air`.
- Kept the existing `make api:start` command unchanged for one-shot API execution.
- Preserved the existing `google.golang.org/api v0.247.0` module version; this results in Air resolving to `v1.62.0` for compatibility with the current module graph.

## Verification
- [x] `make api:build`
- [x] `go tool air -v`
- [x] `go tool air -c .air.toml`

## Tests
No automated tests were added. The change is limited to local development tooling and documentation.

## Next Steps
- None.
