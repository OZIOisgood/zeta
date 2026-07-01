# Business Metrics Observability Research

## Context

The current Google Cloud Monitoring dashboard covers operational health: Cloud
Run, Cloud SQL, latency, errors, logs, uptime, and alerts. The new question is
whether we can also show business metrics such as video uploads, video reviews,
and live coachings over time.

## Recommendation

Use two complementary layers:

1. Keep Google Cloud Monitoring for operational signals and alertable business
   symptoms, for example upload failures, booking failures, recording import
   failures, or an unexpected drop to zero critical events.
2. Build product/business dashboards in Looker Studio backed by BigQuery
   aggregate tables or views. BigQuery can pull from Cloud SQL through federated
   queries, and scheduled queries can materialize hourly or daily snapshots.

Do not make the Cloud Monitoring dashboard poll the backend. Monitoring charts
are designed around metrics, logs, traces, and alerting. A custom backend endpoint
is reasonable only if we intentionally build an internal admin analytics page.

## Existing Zeta Starting Point

- `db/queries/reports.sql` already models video upload and live coaching events
  for user-facing reports.
- `/reports/events` returns a scoped activity timeline with `kind=video` and
  `kind=live`.
- Core source tables already have timestamps:
  - `assets.created_at`, `assets.status`
  - `videos.created_at`, `videos.status`, `videos.duration_seconds`
  - `video_reviews.created_at`
  - `coaching_bookings.created_at`, `scheduled_at`, `is_cancelled`,
    `duration_minutes`
- `audit_events` is append-only and could later support explicit product-event
  analytics, but today it should not be treated as the only source of truth for
  aggregate product counts.

## MVP Dashboard Shape

Start with one clean product dashboard:

- Date range filter: last 7/30/90 days, custom.
- Video uploads:
  - uploads per day/week
  - ready vs failed vs pending
  - total uploaded video duration
- Reviews:
  - reviews/comments created per day/week
  - videos with at least one review
  - average reviews per uploaded video
- Live coaching:
  - sessions booked per day/week
  - sessions completed per day/week
  - cancelled sessions
  - total coaching minutes
- Simple breakdowns:
  - group
  - expert
  - environment

Avoid raw emails, names, notes, review text, and video titles in the first
analytics dashboard. Counts and grouped aggregates are enough for launch.

## Implementation Options

### Option A: Cloud Monitoring custom/log-based metrics

Useful for alerting and system-facing business symptoms. We can emit structured
logs or OpenTelemetry counters such as `video_upload_created`,
`video_upload_failed`, `review_created`, `coaching_booking_created`,
`coaching_session_cancelled`, and then chart/alert on them in Monitoring.

Pros:
- Fits the existing Google Cloud Observability setup.
- Easy to alert on failures or abnormal rates.
- Works well with logs and traces.

Cons:
- Not ideal for product analytics, ad-hoc slicing, or historical backfills.
- High-cardinality labels such as user, group, or video id are a bad fit.
- Log-based metrics are not backfilled from old logs.

### Option B: BigQuery + Looker Studio

Create an analytics dataset with aggregate tables, populated by scheduled
queries from Cloud SQL via BigQuery federated queries, or later by event exports.
Connect Looker Studio to BigQuery and share the report with Google accounts or a
Google Group.

Pros:
- Best fit for time-bucketed business dashboards.
- Easier to filter by date, group, expert, status, and event kind.
- Keeps BI access separate from production DB access.
- Can start with daily/hourly aggregates, not raw event streams.

Cons:
- Needs BigQuery dataset, connection, service account, and scheduled queries.
- Direct federated queries must be kept lightweight so they do not stress Cloud
  SQL.
- Requires a small analytics data model.

### Option C: Internal backend analytics endpoint

Add endpoints such as `/admin/metrics/business` and build charts in the Zeta
dashboard.

Pros:
- Fast if we only need a very small private page.
- Reuses existing auth and API deployment.

Cons:
- We would be building and maintaining our own BI surface.
- Sharing, filtering, exports, permissions, and chart iteration become product
  work.
- Polling the backend on every dashboard open can add avoidable load unless we
  cache aggressively.

## Suggested Path

Phase 1, low risk:
- Define 4-6 aggregate SQL views/queries for product metrics.
- Create a dev BigQuery analytics dataset and Cloud SQL connection.
- Materialize daily/hourly aggregate tables with scheduled queries.
- Build one Looker Studio report over BigQuery.
- Share it with the same Google accounts or a Google Group.

Phase 2:
- Add explicit structured product-event logs for alertable events and failures.
- Add Cloud Monitoring log-based metrics for failure counters and workflow
  warning charts.
- Add alerts only for things that need operational response.

Phase 3:
- If product analytics becomes important, move from scheduled snapshots to a
  proper event pipeline or CDC/export pattern.

## Sources Checked

- Google Cloud Monitoring user-defined metrics: custom metrics are intended for
  application-specific metric data and can be charted and alerted on.
- Google Cloud Logging log-based metrics: metrics can be derived from logs,
  charted, alerted on, and labeled, but they only use logs received after metric
  creation.
- BigQuery Cloud SQL federated queries: BigQuery can query Cloud SQL through
  `EXTERNAL_QUERY`, including PostgreSQL connections.
- BigQuery scheduled queries: recurring GoogleSQL queries can materialize results
  into destination tables.
- Looker Studio BigQuery connector: reports can connect to BigQuery tables,
  views, or custom SQL.
