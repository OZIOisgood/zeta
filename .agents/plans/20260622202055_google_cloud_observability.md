# Google Cloud Observability Plan

## Context

Zeta is approaching its first release and needs a small, useful operational view
for `dev`, with a straightforward path to `prod`. The current deployment runs in
Google Cloud project `zeta-491012`; the API and dashboard run on Cloud Run and the
database is Cloud SQL.

Read-only inspection on 2026-06-22 found:

- Cloud Logging, Monitoring, Trace, and Telemetry APIs are already enabled.
- Cloud Run already sends request, container, and system logs to Cloud Logging and
  publishes platform metrics to Cloud Monitoring.
- The API writes JSON to stdout with `log/slog`; it does **not** currently configure
  an OpenTelemetry SDK, OTLP exporter, collector, application spans, or custom
  metrics. OTel packages in `go.mod` are indirect dependencies only.
- No custom Monitoring dashboards or user-defined log-based metrics exist.
- Current JSON uses `level` and `msg`. Live entries therefore have no recognized
  Cloud Logging `severity` or display `message`, and application logs are not
  correlated with Cloud Run request traces.

## Decision

Use **Google Cloud Observability** for the initial dev and production rollout:

- Cloud Logging for structured application, request, and platform logs.
- Cloud Monitoring for built-in Cloud Run/Cloud SQL metrics, one custom dashboard,
  uptime checks, and alerts.
- Error Reporting for grouped application/platform failures.
- Cloud Trace for request traces; first correlate existing logs with Cloud Run's
  automatically generated traces, then add application OTel spans only after the
  baseline dashboard is useful.
- Terraform for dashboards, alerts, notification channels, uptime checks, IAM, and
  any later log-based metrics. Environment-specific resources must be filtered by
  exact service and database names.

Do not introduce Grafana, Loki, Tempo, Prometheus, Bigtable, BigQuery, or an OTel
Collector in phase 1.

### Why not Grafana now

Google's stack already receives the data, has native Cloud Run/Cloud SQL metrics,
uses the project's IAM, and requires no additional service, storage, authentication,
backup, or upgrade work. Grafana becomes attractive if Zeta later needs a single
cross-cloud UI, Prometheus-first workloads, or materially better dashboard UX.
Self-hosting Grafana + Loki + Tempo now would create an observability platform to
operate before Zeta has enough scale to justify it; Grafana Cloud would add another
vendor and bill.

### Why not Bigtable or BigQuery now

Bigtable is not an observability dashboard or appropriate log backend for this
stage. BigQuery can become useful for long-term product analytics, billing export,
or SQL analysis across large retained log volumes, but it is not needed for live
operations. Product KPIs should come from Zeta's database/reporting model rather
than treating operational logs as an analytics event store.

## Scope Boundary

The first dashboard answers operational questions:

- Is the service reachable?
- Are requests failing or slowing down?
- Is a new revision unhealthy?
- Are CPU, memory, instances, or billable time abnormal?
- Is Cloud SQL constrained?
- Are background jobs or critical integrations failing?
- Which logs and trace explain an incident?

It does not attempt to show signups, conversion funnels, active users, videos per
user, coaching revenue, or other product KPIs. Those belong in product reports and,
if needed later, a BigQuery + Looker Studio analytics track with an explicit event
schema and privacy review.

## Phase 1: Reliable Signals and Dev Dashboard

### 1. Make application logs Cloud Logging-native

Update `internal/logger` and its tests:

- Map `slog`'s `level` to `severity` and `msg` to `message` while keeping JSON stdout.
- On HTTP requests, parse `X-Cloud-Trace-Context` and add
  `logging.googleapis.com/trace`, `logging.googleapis.com/spanId` when available,
  and `logging.googleapis.com/trace_sampled`. Use the configured GCP project ID to
  form the trace resource name.
- Preserve `request_id`, stable snake_case event names, `component`, `err`, method,
  path, status, bytes, and latency.
- Do not log query strings, authorization/cookies, request or response bodies,
  tokens, full emails, raw IP addresses, or OTel attributes containing those values.
- Keep route values bounded. Do not create metrics or trace attributes from raw IDs
  embedded in paths; use route templates when application instrumentation is added.
- Add focused tests for level/message mapping, trace extraction, missing/malformed
  trace headers, and retention of context fields.

This change makes error filters and Error Reporting dependable and lets Logs
Explorer jump from a log to the related Cloud Run trace. No logging client library
or agent is required on Cloud Run.

### 2. Create one compact `Zeta Dev Overview` dashboard

Keep the default view at one hour and limit it to about 10 widgets:

1. Scorecards: request rate, 5xx rate, p95 request latency, and active instances.
2. Requests: request count grouped by response-code class.
3. Latency: p50, p95, and p99 Cloud Run request latency.
4. Runtime: CPU and memory utilization.
5. Capacity/cost signal: instance count and billable container instance time. This
   makes another long-lived SSE cost regression visible.
6. Cloud SQL: CPU, connections, and disk utilization for `zeta-dev`.
7. Error log panel: `zeta-api-dev`, recognized `severity>=ERROR`, newest first.
8. Operational event log panel: warnings/errors for scheduler, email, Mux, Agora,
   Resend inbound, Discord, and recording-import components.

Use built-in Cloud Run and Cloud SQL metrics wherever possible. Do not derive
request rate or latency from application logs. Do not put a trace list on the
always-open overview; link operators to Trace Explorer from correlated error logs.

### 3. Add low-noise alerts

Start with email notifications to one shared operator address or Google Group:

- External HTTPS uptime check for `https://api.dev.strido.net/health`: alert after
  two consecutive failures from multiple regions.
- 5xx alert: both a minimum request volume and an error ratio (for example, at least
  5 requests and over 5% 5xx for 5 minutes) so an idle dev service is not noisy.
- Latency alert: p95 over 2 seconds for 10 minutes with a minimum traffic condition.
- Memory alert: sustained utilization over 85%; CPU over 80% is warning-only at
  first because Cloud Run CPU is bursty.
- Billable-time/instance anomaly: sustained non-zero instances or unexpectedly high
  billable time outside active testing, tuned from one week of baseline data.
- Cloud SQL warnings for disk utilization over 80% and connection saturation.
- Log-based alerts for a small allowlist of critical failures that platform metrics
  cannot express, such as scheduler authentication failure, recording import stuck,
  webhook persistence failure, and process panic.

Every alert must include environment, service, symptom, dashboard link, Logs
Explorer query, and a one-paragraph first response. Dev notifications should be
warning priority; production thresholds and paging are a later explicit decision.

Avoid a generic alert for every error log. Review one week of dev data before
promoting or tightening thresholds.

### 4. Give colleagues least-privilege access

Prefer a Google Group so onboarding/offboarding changes group membership rather
than project IAM. Grant the viewer group:

- `roles/monitoring.viewer`
- `roles/logging.viewer`
- `roles/cloudtrace.user`
- `roles/errorreporting.viewer`

Do not grant `roles/viewer`, `roles/editor`, private-log access, or dashboard edit
access to routine viewers. Grant `roles/monitoring.editor` only to the small set of
maintainers who must edit dashboards or alerts. Before granting access, run a log
sample audit for secrets and raw PII. Store member principals outside committed
Terraform defaults and pass them through the environment's infrastructure inputs.

### 5. Manage the configuration durably

Add a reusable `infra/terraform/modules/observability` module and instantiate it
from `infra/terraform/envs/dev` with exact resource labels for `zeta-api-dev`,
`zeta-dashboard-dev`, and `zeta-dev`. The module should own:

- Monitoring dashboard JSON
- uptime check
- alert policies
- notification channel(s)
- viewer IAM bindings
- only the few log-based metrics proven necessary

Use a stable shared notification address as plain infrastructure configuration,
not Secret Manager. Keep actual viewer principals and notification destinations in
reviewed environment inputs. Run `terraform fmt`, `validate`, and a real dev plan;
apply only after reviewing that no unrelated resources are replaced or deleted.

## Phase 2: Application Tracing

Do this after phase 1 has run for at least one week and specific slow/failing flows
cannot be diagnosed from platform traces and correlated logs.

- Instrument the Go HTTP server and outbound HTTP clients with OpenTelemetry.
- Add bounded manual spans around database calls and the critical Mux, Agora,
  WorkOS, Resend, OpenRouter, Discord, and recording-import workflows.
- Use W3C propagation plus parent-based sampling. Start dev at 10% sampling and
  allow an environment-specific rate; never sample based on user identity.
- Export spans directly with OTLP to Google Cloud's Telemetry API for the initial
  low-volume Cloud Run service and grant its runtime service account only
  `roles/telemetry.tracesWriter`.
- Attach `service.name=zeta-api`, `service.version=<immutable image/revision>`, and
  `deployment.environment.name=dev`; do not attach user IDs, emails, tokens, full
  URLs, SQL text, request bodies, or model prompts/responses.
- Add trace and span IDs to application logs from `context.Context` so child spans,
  logs, and the Cloud Run root trace remain navigable together.
- Verify graceful flush on SIGTERM without delaying shutdown beyond Cloud Run's
  termination window.

Google recommends a Collector when the environment supports one. For Zeta's single,
low-volume API, direct OTLP is intentionally simpler. Revisit a Google-built OTel
Collector sidecar/service when there are multiple instrumented services, a need for
central filtering/redaction, metrics export, tail sampling, or multiple backends.

Do not export logs through OTLP in this phase; Cloud Run stdout ingestion already
solves log delivery. Do not add custom application metrics until a concrete question
cannot be answered by built-in metrics or a bounded log-based metric.

## Production Rollout

After dev has one week of useful signal and acceptable noise:

1. Instantiate the same Terraform module for exact prod resource names; do not let
   prod alerts or widgets match dev resources in the shared project.
2. Create a separate `Zeta Prod Overview`, notification channel, and thresholds.
3. Add a release/revision comparison view and higher-priority notifications for
   uptime and sustained 5xx failures.
4. Define initial service objectives only after real traffic exists: availability
   and p95 latency are the first candidates. Do not invent an SLO from dev traffic.
5. Revisit separate GCP projects for dev and prod before the system handles material
   production data. Separate projects improve IAM, quota, billing, retention, and
   accidental-change isolation; dashboard filters are an interim boundary, not a
   security boundary.

## Cost and Retention Guardrails

- Keep the default Cloud Logging bucket at its default 30-day retention initially.
- Do not duplicate logs into BigQuery or another log bucket without a retention or
  analytics requirement.
- Prefer built-in Cloud Run metrics, which require no setup and are not charged for
  fully managed Cloud Run, over custom metrics.
- Limit user-defined log-based metric labels to bounded values such as environment,
  component, and status class. Never label by request ID, user ID, URL, email, asset
  ID, booking ID, or error string.
- Add the already-recommended GCP billing export and budget alerts as a separate
  cost-control task; billing data is not an application observability widget.
- Review Logging ingestion volume, trace span volume, and custom metric cardinality
  monthly after production launch.

## Implementation Order

1. Fix and test Cloud Logging field mapping and trace correlation.
2. Deploy to dev and verify live structured entries, severity, message, request-log
   nesting, and trace navigation.
3. Add Terraform observability module, dev dashboard, IAM, uptime check, and the
   first alert policies.
4. Apply dev Terraform after plan review; verify dashboard access with a viewer
   account and force controlled 5xx/uptime test incidents.
5. Observe and tune for one week; remove noisy or unactionable widgets/alerts.
6. Add phase-2 OTel application traces only for demonstrated diagnostic gaps.
7. Replicate the tuned baseline to prod with prod-specific thresholds.

## Acceptance Criteria

- A viewer can open one bookmarked dev dashboard and assess health in under a minute.
- Every error log has recognized severity and message fields and can be filtered by
  environment, service, revision, component, event name, and request ID.
- Request-scoped application logs navigate to the corresponding Cloud Run trace.
- The dashboard shows requests, errors, latency, runtime capacity/cost, database
  health, and recent operational failures without user-level data.
- A colleague with viewer roles can see the dashboard, logs, errors, and traces but
  cannot change resources or read private logs.
- Uptime and controlled failure tests create and resolve an incident and deliver an
  actionable notification.
- Terraform plan contains only intended observability and IAM changes.
- No new collector, datastore, Grafana service, or duplicated log pipeline exists.

## Expected Files/Areas

- `internal/logger/logger.go`
- `internal/logger/middleware.go`
- focused logger tests
- `cmd/api/main.go` if project/service metadata must be initialized there
- `.env.example` and both deploy workflows only for new plain OTel/project metadata
- `infra/terraform/modules/observability/`
- `infra/terraform/envs/dev/main.tf`
- later `infra/terraform/envs/prod/main.tf`
- `docs/cicd.md` and README architecture/operations notes
- completion report under `.agents/reports/`

## Verification Planned

- `make test:unit`
- `make api:build`
- `git diff --check`
- Terraform format, validate, and reviewed dev plan
- live redacted Cloud Run log-shape check
- live dashboard query and IAM viewer check
- controlled uptime, 5xx, and critical-log alert tests followed by clean incident
  resolution
- trace-to-log and log-to-trace navigation on a known dev request

## References

- [Cloud Run logging](https://docs.cloud.google.com/run/docs/logging)
- [Cloud Run monitoring and built-in metrics](https://docs.cloud.google.com/run/docs/monitoring)
- [Cloud Run tracing](https://docs.cloud.google.com/run/docs/trace)
- [Go OpenTelemetry instrumentation](https://docs.cloud.google.com/trace/docs/setup/go-ot)
- [Custom dashboard log panels](https://docs.cloud.google.com/monitoring/charts/view-logs)
- [Log-based metrics](https://docs.cloud.google.com/logging/docs/logs-based-metrics)
- [Google Cloud Observability pricing](https://cloud.google.com/stackdriver/pricing)
- [Telemetry API IAM roles](https://docs.cloud.google.com/iam/docs/roles-permissions/telemetry)

## Files Touched

- `.agents/plans/20260622202055_google_cloud_observability.md`

## Verification

- Repository configuration, logger code, deploy workflows, Terraform ownership,
  and the prior GCP cost investigation were inspected.
- Live read-only checks confirmed enabled APIs, no user log metrics or dashboards,
  and the current `level`/`msg` log shape without recognized severity.
- Current official Google Cloud documentation was checked on 2026-06-22.
- No application, Terraform, or live GCP resources were changed.
