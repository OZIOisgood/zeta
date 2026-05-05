# Resolution

## Summary
Corrected Agora Cloud Recording video subscriptions for live coaching sessions. The recorder now includes both fixed participant UIDs in the `subscribeVideoUids` whitelist, matching the student and expert UIDs used by the live session token flow.

## Technical Details
- Added explicit constants for the student, expert, and recording bot UIDs in `internal/coaching/recording.go`.
- Changed the Agora `start` request from recording only video UID `1` to recording video UIDs `1` and `2`.
- Left the audio subscription as `["#allstream#"]`.
- Kept the existing composite recording layout and storage behavior unchanged.

## Tests
Added `TestAgoraStartRecordingSubscribesBothParticipantVideos`, which starts the Agora recording client against an `httptest` server and verifies the JSON request sent to Agora.

## Verification
- [x] Ran `go test ./internal/coaching -run 'TestAgoraStartRecordingSubscribesBothParticipantVideos|TestParticipantUIDForBooking'`.
- [x] Ran `make api:build`.
- [x] Ran `make test:unit`.
- [x] Verified against Agora Cloud Recording documentation that `subscribeVideoUids` is a whitelist for video stream subscriptions.

## Next Steps
- Deploy the API change before creating another test recording.
- Existing generated recordings cannot be corrected by this backend configuration change; only recordings created after deployment will include both subscribed videos.
