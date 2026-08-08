# Container libexpat security fix

## Context

The security workflow failed while scanning the dashboard image because the `nginx:alpine` runtime layer contained `libexpat 2.8.1-r0`, which Trivy flagged for CVE-2026-56131, CVE-2026-56407, and CVE-2026-56408. The fixed Alpine package is `libexpat 2.8.2-r0`.

## Decision

Add an explicit `apk upgrade --no-cache` step to nginx-based runtime images so fixed Alpine packages are applied during image builds even when the base tag still resolves to an older package set.

## Files Touched

- `web/dashboard-next/Dockerfile`
- `web/landing/Dockerfile`

## Verification

- `docker build -t zeta-dashboard-security:local web/dashboard-next`
- `docker build -t zeta-landing-security:local web/landing`
- Verified `/lib/apk/db/installed` reports `libexpat` version `2.8.2-r0` in both local images.

## Follow-ups

- Trivy was not installed locally, so the exact CI scan command was not rerun on this machine.
