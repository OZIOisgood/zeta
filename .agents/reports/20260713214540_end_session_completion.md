# End Session Completion

## Context

Ticket #34 required an expert to intentionally end a live coaching session,
stop its recording without waiting for Agora's idle timeout, and block later
reconnects.

## Decision

Only the booked expert can end a session, and only while its scheduled window
is active. Ending is persisted separately from cancellation, stops any active
recording first, and makes the connect endpoint reject the booking thereafter.

## Files Touched

- Reversible booking end-state migration and coaching sqlc query.
- Coaching connect/end handler, response mapping, generated database code, and
  focused handler tests.
- Dashboard API types, session grouping, call control, and translations.
- README live-coaching flow and this task plan.

## Verification

- `make db:sqlc`
- `go test ./internal/coaching -count=1`
- `make api:build`
- `make test:unit`
- Focused dashboard session-store test, Prettier check, and production build.

## Follow-up

`make mocks` cannot run in this environment because `mockgen` is absent from
`PATH`; the affected database mock was regenerated with the repository-pinned
`go.uber.org/mock` module instead.
