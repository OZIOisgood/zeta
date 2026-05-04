# Resolution

## Summary
Implemented live coaching recording post-processing. Stopped Agora Cloud Recordings are now queued, imported from private GCS into Mux, converted into normal reviewable `assets` and `videos`, and exposed from the Sessions dashboard once ready.

## Technical Details
- Added `coaching_recording_imports` with retryable states: `pending`, `importing`, `processing`, `ready`, and `failed`.
- Added SQLC queries for creating missing imports, claiming work, storing Mux import state, and marking imports ready or failed.
- Added a GCS-backed recording object store that locates the final MP4 under the Agora `file_prefix` and creates a short-lived signed URL for Mux.
- Extended the existing Mux client with `CreateAsset` and used the Mux asset-from-URL flow verified against official Mux documentation.
- Added import processing to the recording cleanup flow and exposed `/internal/coaching/recordings/process` for explicit retry runs.
- Created reviewable assets with status `pending` and videos with status `ready` once Mux reports the imported asset as ready.
- Added recording status and asset/video links to booking responses.
- Updated the Sessions dashboard to show recording status and a Review button for ready recordings.
- Updated dev/prod Terraform so the Cloud Run runtime service account can read the recording bucket and sign URLs.
- Updated root `README.md` and `.env.example`.

## Retention Decision
Raw GCS recording files are retained after Mux import. This avoids deleting source artifacts before a formal retention policy exists. Users still access only the Mux-backed review asset.

## Verification
- [x] `make db:sqlc`
- [x] `make api:build`
- [x] `PATH="$(go env GOPATH)/bin:$PATH" make mocks`
- [x] `make test:unit`
- [x] `zsh -lc 'source ~/.nvm/nvm.sh && nvm use 20.19.1 >/dev/null && make web:build'`

## Tests
Added unit coverage for recording object prefix/selection helpers and public Mux playback ID extraction. Existing booking tests were updated for the new recording response fields.

## Notes
The first direct `make web:build` attempt failed because the shell used Node.js `v16.14.2`, while the installed pnpm requires Node.js `>=18.12`. The build passed with `nvm use 20.19.1`.
