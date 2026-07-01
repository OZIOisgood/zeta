# Business Analytics Dashboard Implementation Plan

## Context

The existing Google Cloud Monitoring dashboard covers operational health. The
next need is a simple business dashboard for video uploads, reviews, and live
coachings over time, with breakdowns by day/week, group, expert, and status.

## Decision

Build a separate Looker Studio report backed by BigQuery aggregate tables.

For the first implementation, populate BigQuery through a BigQuery Data Transfer
scheduled query that uses a BigQuery Cloud SQL federated connection
(`EXTERNAL_QUERY`) with a Terraform-managed read-only Postgres user. Looker
Studio connects only to materialized BigQuery aggregate tables; it does not query
Cloud SQL live when someone opens the report.

This keeps the dashboard simple, avoids backend exporter code, avoids live BI
queries against the application database, and still limits the exported surface
to controlled aggregate rows.

## Scope

Dev first. Production should reuse the same module/design only after the dev
metrics and dashboard shape feel useful.

In scope:

- BigQuery analytics dataset and aggregate tables.
- Read-only analytics viewer IAM.
- BigQuery Cloud SQL federated connection using a read-only analytics DB user.
- BigQuery Data Transfer scheduled query to refresh aggregates.
- Postgres grants for the analytics user through a reversible migration.
- Looker Studio report connected to the BigQuery tables.
- Documentation for access, refresh cadence, and metric definitions.

Out of scope for MVP:

- Real-time event streaming.
- Per-user/student drilldowns.
- Raw review text, notes, email addresses, tokens, video titles, or full audit
  payloads.
- Product analytics alerts in Cloud Monitoring, except exporter health/failure
  logs if useful.
- Backend exporter endpoint; keep it as a later option only if SQL-only
  aggregation becomes too limiting.
- Production rollout.

## Dashboard Shape

One Looker Studio report: `Zeta Dev Business Overview`.

Global controls:

- Date range: last 7/30/90 days and custom range.
- Time granularity: day and week.
- Group filter.
- Expert filter.
- Environment filter, initially `dev` only.
- Status filters where relevant.

Page 1: Overview

- Scorecards:
  - submitted video uploads
  - ready video parts
  - failed video parts
  - review comments
  - videos with at least one review
  - live coachings booked
  - completed live coachings
  - cancelled live coachings
  - total coaching minutes
- Combined time series:
  - uploads
  - reviews
  - completed live coachings
- Data freshness card from the latest successful export run.

Page 2: Video Uploads

- Uploads by day/week.
- Current asset status: pending/completed.
- Current video status: waiting_upload/ready/failed.
- Total uploaded video duration.
- Breakdown by group and expert.
- Optional table: top groups by uploads and ready duration.

Page 3: Reviews

- Review comments by day/week.
- Videos receiving at least one review.
- Average review comments per reviewed video.
- Timestamped vs non-timestamped comments.
- Replies vs top-level comments, using `video_reviews.parent_id`.
- Breakdown by group and expert.

Page 4: Live Coachings

- Bookings created by day/week.
- Sessions completed by scheduled date.
- Cancelled sessions.
- Upcoming sessions.
- Total scheduled/coaching minutes.
- Breakdown by group, expert, and session type.

Page 5: Export Health

- Last export status.
- Rows written per table.
- Export duration.
- Failed export logs link or status table.

## Metric Definitions

Video uploads:

- `submitted_uploads`: count distinct `assets.id` where
  `assets.status != 'waiting_upload'`, bucketed by `assets.created_at`.
- `video_parts`: count `videos.id`, joined through `assets`, bucketed by
  `assets.created_at` for upload cohorts.
- `ready_video_parts`: count current `videos.status = 'ready'`.
- `failed_video_parts`: count current `videos.status = 'failed'`.
- `pending_assets`: count current `assets.status = 'pending'`.
- `completed_assets`: count current `assets.status = 'completed'`.
- `total_video_duration_seconds`: sum `videos.duration_seconds`.

Reviews:

- `review_comments`: count `video_reviews.id`, bucketed by
  `video_reviews.created_at`.
- `reviewed_videos`: count distinct `video_reviews.video_id`.
- `top_level_comments`: count where `parent_id IS NULL`.
- `reply_comments`: count where `parent_id IS NOT NULL`.
- `timestamped_comments`: count where `timestamp_seconds IS NOT NULL`.

Live coaching:

- `bookings_created`: count `coaching_bookings.id`, bucketed by `created_at`.
- `completed_sessions`: count non-cancelled bookings where
  `scheduled_at < now()`, bucketed by `scheduled_at`.
- `upcoming_sessions`: count non-cancelled bookings where
  `scheduled_at >= now()`, bucketed by `scheduled_at`.
- `cancelled_sessions`: count `is_cancelled = true`; for MVP bucket by
  `updated_at` because the current schema has no dedicated `cancelled_at`.
- `total_duration_minutes`: sum `duration_minutes`.

Known limitation:

- Several metrics are current-state aggregates over historical cohorts, not full
  event transition history. For example, a video can be created on Monday and
  become ready on Tuesday, but the MVP upload cohort still buckets it by upload
  creation date. If transition timing becomes important, add explicit
  product-event rows or status-change timestamps later.

## BigQuery Model

Dataset:

- `zeta_analytics_dev`
- location: same Google Cloud region family as the dev services, preferably
  `europe-west1` if supported by all planned resources.
- default table expiration: none for aggregate tables; consider 400-day
  retention after production rollout.

Tables:

- `business_video_uploads_daily`
  - `bucket_date DATE`
  - `bucket_week DATE`
  - `environment STRING`
  - `group_id STRING`
  - `group_name STRING`
  - `expert_id STRING`
  - `expert_display_name STRING`
  - `asset_status STRING`
  - `video_status STRING`
  - `submitted_uploads INT64`
  - `video_parts INT64`
  - `total_duration_seconds FLOAT64`
  - `exported_at TIMESTAMP`

- `business_reviews_daily`
  - `bucket_date DATE`
  - `bucket_week DATE`
  - `environment STRING`
  - `group_id STRING`
  - `group_name STRING`
  - `expert_id STRING`
  - `expert_display_name STRING`
  - `review_comments INT64`
  - `reviewed_videos INT64`
  - `top_level_comments INT64`
  - `reply_comments INT64`
  - `timestamped_comments INT64`
  - `exported_at TIMESTAMP`

- `business_live_coachings_daily`
  - `bucket_date DATE`
  - `bucket_week DATE`
  - `environment STRING`
  - `group_id STRING`
  - `group_name STRING`
  - `expert_id STRING`
  - `expert_display_name STRING`
  - `session_type_id STRING`
  - `session_type_name STRING`
  - `status STRING` (`booked`, `completed`, `upcoming`, `cancelled`)
  - `bookings_count INT64`
  - `total_duration_minutes INT64`
  - `exported_at TIMESTAMP`

- `business_analytics_export_runs`
  - `run_id STRING`
  - `started_at TIMESTAMP`
  - `completed_at TIMESTAMP`
  - `environment STRING`
  - `status STRING`
  - `window_start DATE`
  - `window_end DATE`
  - `video_rows INT64`
  - `review_rows INT64`
  - `coaching_rows INT64`
  - `error STRING`

Partitioning and clustering:

- Partition aggregate tables by `bucket_date`.
- Cluster by `environment`, `group_id`, `expert_id`, and status fields.
- Require partition filters once Looker Studio queries are confirmed to include
  the date control correctly.

## Terraform Plan

Add a reusable module, likely `infra/terraform/modules/business-analytics`.

Resources:

- Enable required APIs:
  - `bigquery.googleapis.com`
  - `bigqueryconnection.googleapis.com`
  - `bigquerydatatransfer.googleapis.com`
- `google_bigquery_dataset` for `zeta_analytics_${environment}`.
- `google_sql_user` for `zeta_analytics_${environment}` with generated password.
- `google_bigquery_connection` for Cloud SQL/Postgres with that user.
- `google_bigquery_table` resources for the four tables above.
- `google_service_account` for the scheduled query runner.
- `google_bigquery_data_transfer_config` with `data_source_id =
  scheduled_query`.
- Dataset IAM:
  - scheduled query service account: dataset write access.
  - Analytics viewers: read access.
- Connection IAM:
  - scheduled query service account: connection user.
- Project IAM:
  - BigQuery Cloud SQL connection service account: Cloud SQL Client.
  - scheduled query service account: BigQuery Job User.
  - Analytics viewers: BigQuery Job User if Looker Studio uses viewer
    credentials.

Inputs:

- `project_id`
- `region`
- `environment`
- `dataset_id`
- `cloud_sql_instance_name`
- `cloud_sql_instance_connection_name`
- `cloud_sql_database_name`
- `analytics_viewer_members`

Dev environment:

- Instantiate the module in `infra/terraform/envs/dev`.
- Add `analytics_viewer_members_csv` as a dev variable, mirroring the existing
  observability viewer pattern.
- Output the dataset id and BigQuery console URL.

Prod environment:

- Accept the same variable names in prod for workflow parity, but do not
  instantiate prod analytics until dev is validated.

GitHub Actions:

- Extend the infra workflow with `TF_VAR_analytics_viewer_members_csv`.
- Add/update GitHub Environment variable:
  - `ANALYTICS_VIEWER_MEMBERS`

## Database Grants

Add a reversible migration that conditionally grants read access to
`zeta_analytics_dev` and `zeta_analytics_prod` only if the role exists:

- `GRANT USAGE ON SCHEMA public`
- `GRANT SELECT ON ALL TABLES IN SCHEMA public`
- `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES`

The conditional role check lets local and test databases apply migrations
without GCP-created users. In live dev, apply Terraform to create the DB user,
then deploy/run migrations so the connection can read the tables.

## Scheduled Query Plan

Use one BigQuery Data Transfer scheduled query for the MVP.

Implementation:

1. `TRUNCATE` the three aggregate tables.
2. Refill each aggregate table from `EXTERNAL_QUERY`:
   - video uploads
   - reviews
   - live coachings
3. Insert a successful run row into `business_analytics_export_runs`.

Idempotency:

- Re-running the scheduled query should produce the same aggregate table state.
- Full refresh is acceptable for the small pre-release dataset. If data volume
  grows, move to rolling-window delete/insert or incremental product events.

Failure handling:

- BigQuery Data Transfer run history is the source of truth for failed refreshes.
- The export-runs table records successful refreshes and data freshness.
- Add Cloud Monitoring alerts for failed transfer runs later if needed.

## Looker Studio Plan

Manual external setup:

1. Create report `Zeta Dev Business Overview`.
2. Add BigQuery data sources for the three aggregate tables and export-runs
   table.
3. Configure date range dimension as `bucket_date`.
4. Add controls for group, expert, status, and date range.
5. Build the five pages listed above.
6. Share the report with the analytics viewer Google accounts or a Google Group.

Credential choice:

- Prefer viewer credentials if all viewers have BigQuery read/job IAM.
- Owner credentials are acceptable for a very small internal dev report, but
  viewer credentials are cleaner for auditability.

Manual output to document:

- Looker Studio report URL.
- Owner account.
- Sharing mode.
- Data source credential mode.

## Privacy And Access

MVP exports only aggregate counts, durations, group names, and expert display
names. Do not export:

- email addresses
- student names
- review/comment text
- coaching notes
- video titles
- raw WorkOS tokens/ids beyond internal grouping ids

If student-level analytics is requested later, treat it as a separate privacy
decision and likely add role-scoped product UI rather than a shared BI dashboard.

Viewer access:

- Reuse the same two Google accounts for dev if desired.
- Prefer a Google Group when more people need access.
- No shared password; access is Google IAM plus Looker Studio sharing.

## Documentation Updates

Update:

- `README.md`: short `Development Business Analytics` section with dashboard
  purpose and Terraform output.
- `docs/cicd.md`: IAM, GitHub variable, Looker Studio manual sharing, and
  non-secret config notes.
- No `.env.example` runtime variable is needed for the MVP because the app does
  not run the exporter.
- Completion report under `.agents/reports/` after implementation.

## Verification

Before apply:

- `terraform fmt -check`
- `terraform validate` for dev and prod
- real dev Terraform plan, checking only expected BigQuery/IAM/Scheduler changes
- YAML parse for workflow changes

Backend/database:

- migration compiles/applies in local/test DB even when analytics roles do not
  exist
- `make test:unit`

Live dev:

- BigQuery dataset and tables exist.
- Analytics Cloud SQL user exists.
- BigQuery connection exists and its service account has Cloud SQL Client.
- Data Transfer scheduled query exists and is enabled.
- First transfer run succeeds after the grant migration is applied.
- BigQuery tables contain recent rows.
- Re-running the export does not duplicate rows.
- Looker Studio report renders with date/group/expert filters.
- Two viewer accounts can open the report and see data.

## Rollout Steps

1. Implement Terraform module and dev wiring.
2. Add conditional Postgres read grants migration.
3. Add GitHub/docs surfaces.
4. Apply dev Terraform to create the analytics user, dataset, connection, and
   scheduled query.
5. Deploy/run migrations so the analytics DB user gets `SELECT` grants.
6. Run one manual scheduled query transfer.
7. Build Looker Studio report.
8. Share access and verify with viewer accounts.
9. Tune metric definitions after the first real data review.
10. Only then decide whether to mirror the setup for production.

## Open Decisions Before Implementation

- Export cadence: daily is enough for launch, hourly is better while tuning.
- Whether expert display names are acceptable in the shared report. If not, use
  expert ids or anonymized labels.
- Whether to include group names or only group ids in production.
- Whether Looker Studio should use owner credentials or viewer credentials.
- Exact initial viewer list, or whether to move to a Google Group now.
