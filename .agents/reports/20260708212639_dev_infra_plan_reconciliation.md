# Dev Infra Plan Reconciliation

## Context

The manual `Infra` workflow plan for `dev` failed on July 8, 2026. Dev Terraform state still contains an abandoned `business_analytics_dev` experiment, while current `main` no longer declares that module. Terraform also failed while refreshing existing dev Monitoring alert policies because the GitHub deploy service account lacked Monitoring edit/read permissions for Terraform-owned observability resources.

## Decision

- Keep the abandoned analytics feature removed from code/config.
- Destroy the analytics resources from dev state after explicit approval.
- Add a durable, dev-only Monitoring Editor grant for the deploy service account because dev Terraform owns Monitoring dashboard, uptime check, notification channel, and alert policies.
- Bootstrap the same grant live with `gcloud projects add-iam-policy-binding` so CI can refresh the existing alert policies before Terraform has adopted the new IAM member into state.
- Ignore Cloud Run v2 service-level `scaling` drift in the shared module. Terraform still manages revision template min/max instances; the service-level block is returned by the API with default zero values and remained as a perpetual diff after apply.

## Files Touched

- `infra/terraform/envs/dev/main.tf`
- `infra/terraform/modules/cloud-run/main.tf`
- `infra/terraform/modules/github-wif/main.tf`
- `infra/terraform/modules/github-wif/variables.tf`

## Verification

- `terraform fmt -check -recursive infra/terraform`
- `terraform -chdir=infra/terraform/envs/dev validate`
- `terraform -chdir=infra/terraform/envs/prod validate`
- `git diff --check`
- Dev apply completed successfully: `1 added, 2 changed, 25 destroyed`
- Terraform state only contains `module.github_wif.google_project_iam_member.monitoring_editor[0]` from the filtered analytics/monitoring/BigQuery/service-usage set
- Deploy service account has `roles/monitoring.editor`; old `roles/bigquery.admin`, `roles/bigquery.connectionAdmin`, and `roles/serviceusage.serviceUsageAdmin` grants are absent from the filtered IAM check
- Post-apply dev plan completed successfully with `No changes`

## Follow-Up

No remaining infra reconciliation follow-up. The next dev infra plan should be able to refresh Monitoring resources and should not include the abandoned analytics stack or Cloud Run service-level scaling drift.
