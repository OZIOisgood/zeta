# Business Analytics Dashboard Implementation

## Context

Implemented the dev foundation for a Looker Studio business dashboard backed by
materialized BigQuery aggregates. The final architecture uses BigQuery Data
Transfer scheduled queries with a Cloud SQL federated connection, not a backend
exporter.

## Delivered

- Updated the implementation plan to use scheduled/federated BigQuery refreshes.
- Added `infra/terraform/modules/business-analytics`.
- Instantiated dev business analytics infrastructure:
  - BigQuery dataset `zeta_analytics_dev`
  - four partitioned aggregate tables
  - BigQuery Cloud SQL connection `zeta_dev_cloud_sql`
  - read-only Cloud SQL user `zeta_analytics_dev`
  - scheduled query `Zeta Dev business analytics refresh`
  - transfer service account and least-privilege IAM
  - viewer IAM for `h.mergel@gmail.com` and `ozioisg@gmail.com`
- Added a reversible migration granting analytics roles read-only Postgres access
  when the roles exist.
- Added GitHub dev environment variable `ANALYTICS_VIEWER_MEMBERS`.
- Updated README and CI/CD docs.

## Live State

- Project: `zeta-491012`
- Dataset URL:
  `https://console.cloud.google.com/bigquery?project=zeta-491012&ws=!1m4!1m3!3m2!1szeta-491012!2szeta_analytics_dev`
- Enabled APIs:
  - `bigquery.googleapis.com`
  - `bigqueryconnection.googleapis.com`
  - `bigquerydatatransfer.googleapis.com`
- Scheduled query transfer config:
  `projects/1018140869546/locations/europe-west1/transferConfigs/6a43e277-0000-25fc-bcf1-d4f547f03720`
- Manual Data Transfer run succeeded after removing `destination_dataset_id`
  from the DML/script scheduled query config.
- Current aggregate row counts after refresh:
  - uploads: 14
  - reviews: 6
  - coachings: 23
  - successful refresh runs: 2

## Files Touched

- `.agents/plans/20260623233508_business_analytics_dashboard_implementation_plan.md`
- `.agents/reports/20260623225512_business_metrics_observability_research.md`
- `.github/workflows/infra.yml`
- `README.md`
- `docs/cicd.md`
- `db/migrations/20260623234500_grant_analytics_read_access.*.sql`
- `infra/terraform/envs/dev/main.tf`
- `infra/terraform/envs/prod/main.tf`
- `infra/terraform/modules/business-analytics/`
- `infra/terraform/modules/github-wif/main.tf`

## Verification

- `terraform fmt -recursive infra/terraform`
- `terraform validate` for dev and prod
- real dev Terraform plan
- targeted dev Terraform apply for analytics resources only
- dev migration via Cloud SQL Auth Proxy
- manual BigQuery query refresh
- manual BigQuery Data Transfer run: `SUCCEEDED`
- BigQuery table row-count checks
- enabled API inspection
- SQL user inspection
- workflow YAML parse
- `git diff --check`
- `make test:unit`
- `make api:build`

## Follow-up

- Create the Looker Studio report manually from the three aggregate tables and
  export-runs table, then share it with the same viewer accounts or a Google
  Group.
- The full dev Terraform plan still contains only the pre-existing Cloud Run
  zero-value normalization diff for API and dashboard services. It was not
  applied as part of this work.
