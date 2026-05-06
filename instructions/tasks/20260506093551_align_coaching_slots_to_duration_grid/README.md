# Task: align coaching slots to duration grid

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
Ensure computed live coaching slots start on predictable duration boundaries even when an expert's availability starts at an irregular minute, such as 13:33 or 16:46.

For example, if availability starts at 16:01:

- 5-minute slots should start at 16:05, 16:10, and subsequent 5-minute boundaries.
- 10-minute slots should start at 16:10, 16:20, and subsequent 10-minute boundaries.
- 15-minute slots should start at 16:15, 16:30, and subsequent 15-minute boundaries.

Session durations should remain within the existing 15-120 minute range and must use 5-minute increments so generated slot times remain user-friendly.

## Context
- Slot generation is implemented in `internal/coaching/slots.go`.
- Session type validation is implemented in `internal/coaching/session_types.go`.
- The dashboard currently presents duration options that already satisfy 5-minute increments.
- No new permissions are required. The existing coaching availability and booking permissions continue to apply.

## Test Assessment
- Automated unit tests are required because this changes booking-slot business logic.
- Dashboard asynchronous loading states are not touched.

## Acceptance Criteria
- [x] Available slot starts are rounded up to the next session-duration boundary in the expert's local day.
- [x] Slots never start before the configured availability start and never end after availability end.
- [x] Session type durations must be 15-120 minutes and divisible by 5.
- [x] The dashboard session type selector offers valid 5-minute duration increments.
- [x] Unit tests cover odd availability starts and duration-step validation.
- [x] `make api:build` succeeds.
- [x] `make web:build` succeeds.
