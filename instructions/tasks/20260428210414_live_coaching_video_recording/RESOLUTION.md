# Resolution

## Summary
- Added optional Agora Cloud Recording for live coaching bookings.
- Added persistent recording state to the dedicated `coaching_booking_recordings` table.
- Added server-side start/stop integration with Agora Cloud Recording REST APIs.
- Added frontend stop call when the user leaves the video call page.
- Updated project documentation and task tracking.

## Technical Details
- Recording is disabled by default and controlled by `AGORA_CLOUD_RECORDING_ENABLED`.
- The implementation uses Agora's current Cloud Recording REST base URL (`https://api.sd-rtn.com`) and Basic HTTP authentication with REST customer credentials.
- Dev/prod Terraform provisions one Google Cloud Storage bucket per environment and generates service-account HMAC credentials for Agora Cloud Recording (`vendor=6`, `region=0`).
- Cloud Run deploys use plain env vars for static recording settings and Secret Manager only for credentials.
- Participant UIDs are deterministic per booking role: student `1`, expert `2`, recording bot `3`.
- Recording start is serialized with a booking row lock so concurrent joins do not start duplicate recordings.
- Recording metadata is modeled as a one-to-one child of `coaching_bookings` to keep the booking table focused on scheduling data.
- Recording stop treats Agora `404` as an already-stopped recording, matching Agora's documented stop behavior.
- A scheduler-protected cleanup endpoint stops active recordings after the scheduled session end.

## Verification
- [x] `make db:sqlc`
- [x] `make mocks`
- [x] `make api:build`
- [x] `make test:unit`
- [x] `make web:build`

## Tests

Added focused backend unit coverage for recording UID and lifecycle helper behavior. Regenerated sqlc output and DB mocks after moving recording state into its own table.

## Notes

`make web:build` was verified through nvm with Node `v20.19.1` on April 29, 2026. The build completes with existing Angular warnings for unused `TuiButton` imports, the initial bundle budget, and the CommonJS Agora SDK dependency.

## Next Steps

- Decide how recorded cloud-storage files should be imported into the asset/Mux review workflow.
