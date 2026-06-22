# Google Cloud Observability Implementation

## Context

Implemented the first dev observability baseline from the Google Cloud
Observability plan. Access uses Google IAM rather than shared credentials.

## Delivered

- Cloud Logging-compatible `severity`, `message`, and `timestamp` fields for Go
  `slog` JSON output.
- Request log correlation with Cloud Run traces through
  `X-Cloud-Trace-Context` and the standard Cloud Logging trace fields.
- Reusable Terraform observability module with viewer IAM inputs and an optional
  email notification channel.
- Live `Zeta Dev Overview` dashboard with 11 Cloud Run, Cloud SQL, and log widgets.
- Live multi-region HTTPS `/health` uptime check.
- Six live dev warning policies: uptime, 5xx ratio with traffic floor, p95 latency,
  memory, Cloud SQL disk, and critical application workflow logs.
- Dev/prod runtime parity for the plain `GCP_PROJECT_ID` trace-correlation value.
- GitHub Environment inputs and operator documentation for viewer members and
  notification email.
- Read-only dashboard, logs, traces, and Error Reporting access for
  `h.mergel@gmail.com` and `ozioisg@gmail.com`.

## Live State

- Project: `zeta-491012`
- Dashboard: `Zeta Dev Overview`
- Dashboard URL:
  `https://console.cloud.google.com/monitoring/dashboards/builder/2cfc3537-21a7-4acd-b957-ce95b8c0bacf?project=zeta-491012`
- Required enabled APIs were already present: Logging, Monitoring, Trace, and
  Telemetry. No additional API was needed.
- The uptime target returned `{"status":"ok"}` during verification.

## Files Touched

- `internal/logger/`, `internal/api/server.go`
- `.env.example`
- dev/prod deploy workflows and the infra workflow
- `infra/terraform/modules/observability/`
- dev Terraform environment; prod accepts shared workflow inputs but does not yet
  instantiate production observability
- `README.md`, `docs/cicd.md`
- implementation plan and this report

## Verification

- `go test ./internal/logger ./internal/api`
- `make test:unit`
- `make api:build`
- Terraform format and dev/prod validation
- real dev Terraform plan and live apply
- YAML parse for all workflows
- `git diff --check`
- live dashboard inspection: 11 expected widgets
- live alert inspection: six enabled policies
- live uptime check and enabled-API inspection
- runtime scaling verification after apply: min 0, max 3, concurrency 80,
  1 vCPU, 512 MiB

The repository's documented config audit helper lives under the skill directory,
not the root `scripts/` path; it was run successfully from its actual location.

## Follow-up

`OBSERVABILITY_VIEWER_MEMBERS` is set in the dev GitHub Environment and all eight
IAM bindings were verified in live project policy and Terraform state. Both users
sign in with their own Google credentials; no shared password exists or is stored.

An email notification channel remains optional because no shared notification
address was requested. Set `OBSERVABILITY_NOTIFICATION_EMAIL` and apply dev
Terraform when email delivery of Monitoring incidents is wanted.

The full dev plan still reports a pre-existing Google provider normalization diff
for zero-valued Cloud Run min/manual instance fields. The live scale-to-zero and
resource limits are unchanged; do not mix that provider-only diff into unrelated
infrastructure work without a deliberate reconciliation.
