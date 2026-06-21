# GCP Cost Investigation

## Context

GCP spend for `zeta-491012` rose from about EUR 8 in May to a June forecast of
about EUR 21.49 before production launch. This was a read-only investigation of
live resources, Cloud Monitoring metrics, Cloud Run request logs, and repository
deployment configuration on 2026-06-21.

## Findings

1. **Cloud Run notification SSE is the cost spike.** `zeta-api-dev` exposes
   `/notifications/stream`; the dashboard opens it for every authenticated shell
   and `EventSource` reconnects automatically. Cloud Run terminates each request
   at its 300-second timeout. On 2026-06-17, 385 stream requests averaged 299.4
   seconds and accounted for 115,283 of 115,305 total request-seconds. Cloud Run
   reported 71,698 billable instance-seconds that day. Normal API and scheduler
   work accounted for only seconds.
2. **The same behavior previously affected legacy `zeta-api`.** On 2026-06-09,
   145 stream requests accounted for 43,344 request-seconds. The legacy service
   has had no request metric after 2026-06-13, but still exists alongside
   `zeta-dashboard`.
3. **The spike has currently stopped.** For 2026-06-20, `zeta-api-dev` handled
   911 completed requests with only 88.8 total request-seconds and no SSE
   requests; Cloud Run reported 157 billable instance-seconds. This is consistent
   with authenticated dashboard tabs no longer being open, not with a durable
   fix: the SSE code and automatic reconnect remain enabled.
4. **Dev has intentional background traffic.** Three Cloud Scheduler jobs call
   `zeta-api-dev` every five minutes (864 calls/day total), and audit maintenance
   runs daily. On 2026-06-20, inbound reconciliation used about 80.5 seconds/day;
   reminders and recording cleanup used about 8.2 seconds/day combined. These
   jobs are not the June Cloud Run spike, though their dev cadence can be reduced.
5. **No production API, dashboard, SQL, scheduler, or recording bucket is live.**
   There is one SQL instance, `zeta-dev` (`db-f1-micro`, zonal, 10 GiB,
   `activationPolicy=ALWAYS`). Its daily mean CPU utilization is about 8%, so it
   is a small fixed baseline rather than a load-driven cost. `zeta-landing` is a
   production-labeled public landing service. A prod Terraform state object
   exists, but the dedicated prod application resources described in current
   Terraform are absent from the live inventory.
6. **Current Cloud Run scaling is not misconfigured.** All live services have
   minimum instances 0, CPU throttling enabled, and small resource limits.
   `zeta-api-dev` is 1 vCPU/512 MiB, max 3, concurrency 80. The long request itself
   keeps an instance billable despite scale-to-zero.
7. **Other inventory is small.** Artifact Registry contains about 3.82 GB. There
   are no GCE VMs and the GKE API is disabled. The visible landing services have
   bot/scanner traffic but negligible cost in the supplied report.
8. **No request 5xx entries were found from 2026-06-14 onward.** Public endpoints
   receive routine automated scans; these finish in milliseconds and are not the
   cost cause.

## Billing Visibility Limits

There is no BigQuery billing export dataset in the project, so `gcloud` cannot
reconstruct invoice-level service/SKU/credit totals. The Cloud Billing Budget API
is disabled, so existing budgets could not be inspected without changing project
state. The supplied Billing and Cloud Run screenshots were used for EUR cost
totals; Monitoring supplied usage attribution.

## Recommended Actions

1. Replace always-connected SSE before production. For the current scale, use a
   short notification fetch on window focus/visibility plus low-frequency polling
   with backoff, or explicitly enable realtime only where its always-on cost is
   accepted. Shortening the SSE timeout or removing heartbeats will not help while
   `EventSource` reconnects automatically.
2. Until that change ships, close authenticated dev dashboard tabs when unused or
   feature-disable the stream in dev. This immediately restores scale-to-zero.
3. Reduce or pause five-minute dev schedulers when those workflows are not under
   test. This is secondary: their observed Cloud Run execution was under 90
   seconds/day after SSE stopped.
4. Stop `zeta-dev` Cloud SQL during extended inactive periods if scheduler/API
   downtime is acceptable. It is the main remaining fixed dev baseline.
5. Delete legacy `zeta-api` and `zeta-dashboard` after domain routing and rollback
   needs are verified. They are currently idle, so this is cleanup and risk
   reduction more than immediate savings.
6. Before applying prod Terraform, reconsider `min_instances=1` for both prod
   services and the regional Cloud SQL instance. Use scale-to-zero and zonal SQL
   during prelaunch unless the availability tradeoff justifies their fixed cost.
7. Enable a billing export and budget alerts (for example at 50%, 80%, and 100%)
   so future investigations can attribute exact SKU costs and credits from CLI/SQL.
8. Add Artifact Registry cleanup retention for old untagged images.

## Files Touched

- `.agents/reports/20260621121210_gcp_cost_investigation.md`

## Verification

- Read-only `gcloud` inventory: Cloud Run, Cloud SQL, Scheduler, GCE, GCS,
  Artifact Registry, enabled APIs, and billing linkage.
- Cloud Monitoring API: daily Cloud Run requests, billable instance time, CPU and
  memory allocation; Cloud SQL daily CPU utilization.
- Cloud Logging API: per-path request count and latency for representative spike
  and post-spike days; 5xx scan.
- Repository inspection: Terraform dev/prod scaling, deploy workflows, SSE API,
  dashboard `EventSource`, and configuration ownership docs.
- No GCP APIs were enabled and no live resources were changed.
