output "workload_identity_provider" {
  description = "Full resource name of the WIF provider (use as GCP_WIF_PROVIDER secret)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "service_account_email" {
  description = "Deploy service account email (use as GCP_SERVICE_ACCOUNT secret)"
  value       = google_service_account.deploy.email
}
