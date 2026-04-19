# Resolution

## Summary

Implemented a full testing architecture for the Go backend: extracted 5 interfaces from external dependencies, updated all handler constructors, generated mocks with uber-go/mock, created a testcontainers-based test DB helper, and wrote 42 test cases across unit, service, and integration layers.

## Implementation Notes

### What was implemented

**Phase 1 — Interfaces**: All 5 interfaces extracted:

- `db.Querier` — auto-generated via `sqlc.yaml` `emit_interface: true` (~60 methods)
- `email.Sender` — in `internal/email/service.go`
- `llm.Enhancer` — in `internal/llm/service.go`
- `auth.UserManagement` — in `internal/auth/workos.go` (10 methods wrapping WorkOS SDK)
- `assets.MuxClient` — in `internal/assets/mux.go` (3 methods wrapping Mux SDK)

**Phase 2 — Constructor updates**: All handlers updated to accept interfaces:

- `groups.NewHandler(q db.Querier, ...)`
- `reviews.NewHandler(q db.Querier, ..., llm llm.Enhancer)`
- `assets.NewHandler(q db.Querier, mux MuxClient, email email.Sender, workos auth.UserManagement, ...)`
- `coaching.NewHandler(q db.Querier, ..., email email.Sender, workos auth.UserManagement, ...)`
- `invitations.NewHandler(q db.Querier, email email.Sender, workos auth.UserManagement, ...)`
- `users.NewHandler(..., q db.Querier, email email.Sender, workos auth.UserManagement)`
- `auth.NewHandler(..., q db.Querier, workos UserManagement)`
- `auth.RequireGroupMembership(q db.Querier, ...)`
- `api/server.go` updated to create and pass concrete wrapper instances

**Phase 3 — Mocks**: All 5 mocks generated in `internal/*/mocks/`:

- `db/mocks/mock_querier.go`
- `email/mocks/mock_sender.go`
- `llm/mocks/mock_enhancer.go`
- `auth/mocks/mock_workos.go`
- `assets/mocks/mock_mux.go`

**Phase 4 — testdb**: `internal/testdb/testdb.go` with testcontainers, auto-applies migrations.

**Phase 5 — Unit tests** (27 test cases):

- `internal/permissions/permissions_test.go` (5 tests)
- `internal/coaching/helpers_test.go` (10 tests covering parseTime, parseTimeRange, pgTimeToString, formatDuration, bookingStatus, collectUserIDs, uuidToString, overlapsBooking, isBlocked)

**Phase 6 — Service tests** (15 test cases):

- `internal/groups/handler_test.go` (7 tests: ListGroups auth/success/error, CreateGroup success/validation)
- `internal/reviews/handler_test.go` (8 tests: ListReviews auth/success/error, CreateReview success/completed-asset/empty/error)

**Phase 7 — Integration test**:

- `internal/groups/integration_test.go` — CreateAndListGroups with real Postgres (build tag: `integration`)

**Phase 8 — Makefile + go:generate**:

- `//go:generate mockgen` directives added to all interface source files
- `internal/db/generate.go` — generate directive for Querier mock
- Makefile targets: `test:unit`, `test:integration`, `test:coverage`, `mocks`

### Technical decisions

- `h.q.WithTx(tx)` replaced with `db.New(tx)` in booking transactions because the sqlc-generated `Querier` interface doesn't include `WithTx`
- `auth.NewWorkOSClient()` wraps all WorkOS `usermanagement.*` package-level functions into a struct implementing `UserManagement`
- Integration tests use `//go:build integration` tag to avoid requiring Docker for unit test runs
- `AuthenticateWithRefreshToken` returns `RefreshAuthenticationResponse` (not `AuthenticateResponse`)

## Verification

- [x] Build passed (`go build ./...`)
- [x] All 42 tests pass (`go test ./...`)
- [x] Coverage: 5.3% total (100% permissions, 34.6% reviews, 32% groups, 6.6% coaching)
