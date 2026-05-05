# Task: fix coaching recording video subscriptions

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a coaching session participant, I want the generated recording to include both users' video streams so that the reviewed recording matches the live session experience.

The reported symptom is that the live call shows both participants correctly, but the generated recording contains a black area and only one participant video. The live call subscription and the Agora Cloud Recording subscription are separate flows, so the recording configuration must explicitly include both participant video UIDs.

## Context
- `internal/coaching/connect.go` assigns participant UIDs for the live Agora channel.
- `internal/coaching/recording.go` builds the Agora Cloud Recording `start` request.
- `internal/coaching/recording_test.go` contains the recorder behavior tests.
- Agora Cloud Recording documentation states that `subscribeVideoUids` is a video subscription whitelist and that composite recording records multiple user IDs into a single output file.

## Permissions
No new application permissions are required. This change only corrects the server-side Agora recording subscription list.

## Test Decision
Automated coverage is required because the behavior depends on the JSON request sent to Agora rather than on a local domain model alone. A unit test should verify that the recorder starts with both fixed participant video UIDs.

## Acceptance Criteria
- [x] Agora Cloud Recording start requests subscribe to student UID `1` and expert UID `2` for video.
- [x] Audio subscription remains configured for all streams.
- [x] The fix is covered by a unit test.
- [x] Backend build and unit tests pass.
